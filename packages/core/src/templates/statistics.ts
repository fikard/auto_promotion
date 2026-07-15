/** 实验结果数据 */
export interface VariantStats {
  variantId: string;
  samples: number;
  conversions: number;
  conversionRate: number;
}

/** 实验统计结果 */
export interface ExperimentResult {
  experimentId: string;
  variants: VariantStats[];
  winner?: string;
  confidence: number;
  isSignificant: boolean;
  pValue: number;
}

export class ExperimentStats {
  /**
   * 标准正态分布 CDF 近似（Abramowitz and Stegun 7.1.26）
   * 最大误差 < 7.5e-8
   */
  private static normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);

    // t = 1 / (1 + p*|x|)
    const t = 1 / (1 + p * absX);
    // 多项式近似
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

    return 0.5 * (1 + sign * y);
  }

  /**
   * 标准正态分布的分位数函数近似（逆 CDF）
   * 使用 Rational approximation (Peter Acklam 算法)
   */
  private static normalInvCDF(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    // 低位区：0 < p < p_low
    const a = [
      -3.969683028665376e+01,
       2.209460984245205e+02,
      -2.759285104469687e+02,
       1.383577518542399e+02,
      -3.066479806629532e+01,
       2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01,
       1.615858368580459e+02,
      -1.556983798598506e+02,
       6.680131188771969e+01,
      -1.328069735645429e+01,
       1.000000000000000e+00,
    ];
    // 高位区：p_high < p < 1
    const c = [
      -7.784894002430293e-03,
      -3.223964889162965e-01,
      -2.400758277785799e+00,
      -2.549732539317983e+00,
       4.374664141464968e+00,
       2.938163982698783e+00,
    ];
    const d = [
       7.784695709041462e-03,
       3.224671290700398e-01,
       2.445134137142712e+00,
       3.755407664762774e+00,
       1.000000000000000e+00,
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number, r: number;

    if (p < pLow) {
      // 有理近似低位区
      q = Math.sqrt(-2 * Math.log(p));
      const num = ((((a[0] * q + a[1]) * q + a[2]) * q + a[3]) * q + a[4]) * q + a[5];
      const den = ((((b[0] * q + b[1]) * q + b[2]) * q + b[3]) * q + b[4]) * q + b[5];
      return num / den;
    } else if (p <= pHigh) {
      // 有理近似中心区
      q = p - 0.5;
      r = q * q;
      const num = ((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5] * q;
      const den = ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5];
      return num / den;
    } else {
      // 有理近似高位区
      q = Math.sqrt(-2 * Math.log(1 - p));
      const num = ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5];
      const den = ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + d[4]) * q + d[5];
      return -num / den;
    }
  }

  /**
   * 计算两个变体之间的 Z 检验
   * 用于判断 A/B 测试结果是否具有统计显著性
   */
  static zTest(control: VariantStats, treatment: VariantStats): { zScore: number; pValue: number } {
    const n1 = control.samples;
    const n2 = treatment.samples;
    const p1 = control.conversionRate;
    const p2 = treatment.conversionRate;

    // 合并比例
    const pooledP = (control.conversions + treatment.conversions) / (n1 + n2);

    // Z 分数：z = (p1 - p2) / sqrt(p*(1-p)*(1/n1 + 1/n2))
    const denominator = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
    const zScore = denominator === 0 ? 0 : (p2 - p1) / denominator;

    // 双尾 p-value
    const pValue = 2 * (1 - ExperimentStats.normalCDF(Math.abs(zScore)));

    return { zScore, pValue };
  }

  /**
   * 计算所需最小样本量
   * @param baselineRate 基线转化率
   * @param minimumDetectableEffect 最小可检测效应
   * @param significanceLevel 显著性水平（默认 0.05）
   * @param power 统计功效（默认 0.8）
   */
  static minimumSampleSize(
    baselineRate: number,
    minimumDetectableEffect: number,
    significanceLevel: number = 0.05,
    power: number = 0.8
  ): number {
    // delta = baselineRate * minimumDetectableEffect
    const delta = baselineRate * minimumDetectableEffect;
    // p = baselineRate（使用基线率作为合并比例的近似）
    const p = baselineRate;

    // Z_alpha/2: 显著性水平对应的 Z 值
    const zAlphaHalf = ExperimentStats.normalInvCDF(1 - significanceLevel / 2);
    // Z_beta: 功效对应的 Z 值
    const zBeta = ExperimentStats.normalInvCDF(power);

    // n = (Z_alpha/2 + Z_beta)^2 * p*(1-p) / delta^2
    const n = Math.pow(zAlphaHalf + zBeta, 2) * p * (1 - p) / (delta * delta);

    return Math.ceil(n);
  }

  /**
   * 分析实验结果
   */
  static analyze(experimentId: string, variants: VariantStats[], significanceLevel: number = 0.05): ExperimentResult {
    // control 为第一个变体
    const control = variants[0];
    // 找到转化率最高的 treatment
    const treatments = variants.slice(1);
    const bestTreatment = treatments.length > 0
      ? treatments.reduce((best, cur) => cur.conversionRate > best.conversionRate ? cur : best, treatments[0])
      : null;

    // 样本量不足时（< 30），直接判定不显著
    const hasSufficientSamples = variants.every(v => v.samples >= 30);

    if (!bestTreatment || !hasSufficientSamples) {
      return {
        experimentId,
        variants,
        confidence: 0,
        isSignificant: false,
        pValue: 1,
      };
    }

    // 执行 Z 检验
    const { zScore, pValue } = ExperimentStats.zTest(control, bestTreatment);
    const isSignificant = pValue < significanceLevel;
    const confidence = 1 - pValue;

    // 判定胜者：仅在显著且 treatment 转化率更高时才有胜者
    const winner = isSignificant && bestTreatment.conversionRate > control.conversionRate
      ? bestTreatment.variantId
      : undefined;

    return {
      experimentId,
      variants,
      winner,
      confidence,
      isSignificant,
      pValue,
    };
  }
}
