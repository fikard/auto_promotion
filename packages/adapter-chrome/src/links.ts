export class ChromeLinks {
  private storeUrl: string;

  constructor(storeUrl: string) {
    this.storeUrl = storeUrl;
  }

  openStorePage(): void {
    window.open(this.storeUrl, '_blank');
  }

  openShareUrl(url: string): void {
    window.open(url, '_blank', 'width=600,height=400');
  }

  getStoreUrl(): string {
    return this.storeUrl;
  }
}
