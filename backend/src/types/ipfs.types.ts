export interface IpfsUploadResult {
  cid: string;
  size: number;
  name: string;
  timestamp: string;
  gatewayUrl: string;
}

export interface IpfsUploadInput {
  content: Buffer | Record<string, unknown>;
  name?: string;
  metadata?: Record<string, string>;
}
