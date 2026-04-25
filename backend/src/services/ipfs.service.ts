import { PinataSDK } from "pinata";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import type { IpfsUploadInput, IpfsUploadResult } from "../types/ipfs.types";

class IpfsService {
  private readonly pinata: PinataSDK;

  constructor() {
    this.pinata = new PinataSDK({
      pinataJwt: env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY_URL,
    });
  }

  async upload(input: IpfsUploadInput): Promise<IpfsUploadResult> {
    const { content, name = "upload", metadata = {} } = input;

    try {
      let file: File;

      if (Buffer.isBuffer(content)) {
        file = new File([content], name, { type: "application/octet-stream" });
      } else {
        const json = JSON.stringify(content);
        file = new File([json], `${name}.json`, { type: "application/json" });
      }

      const response = await this.pinata.upload.public.file(file).addMetadata({
        name,
        keyValues: metadata,
      });

      const cid: string = response.cid;
      const size: number = response.size ?? (Buffer.isBuffer(content) ? content.byteLength : Buffer.byteLength(JSON.stringify(content)));

      return {
        cid,
        size,
        name: response.name ?? name,
        timestamp: new Date().toISOString(),
        gatewayUrl: `${env.PINATA_GATEWAY_URL}/${cid}`,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;

      const message =
        err instanceof Error
          ? err.message
          : "IPFS upload failed — unknown error";

      throw new AppError(
        `IPFS upload failed: ${message}`,
        StatusCodes.BAD_GATEWAY,
        "IPFS_UPLOAD_FAILED"
      );
    }
  }
}

export const ipfsService = new IpfsService();
