import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { AppError } from "../errors/AppError";
import Asset from "../models/Asset.model";
import Manifest from "../models/Manifest.model";
import type {
  IpfsPinInput,
  IpfsPinListQuery,
  IpfsPinResult,
  IpfsUnpinResult,
  PinReleaseOutcome,
  TrackedIpfsPinListResult,
} from "../types/ipfs.types";
import logger from "../utils/logger";
import { ipfsService, isValidCid } from "./ipfs.service";

interface CidReferences {
  assetIds: string[];
  manifestIds: string[];
}

/**
 * Pin Lifecycle Service
 * Combines Pinata pin operations with MongoDB reference tracking so a CID is
 * only released once no Asset or Manifest depends on it. IPFS is
 * content-addressed, so identical uploads share a CID and must not be
 * unpinned while any copy is still referenced.
 */
class PinLifecycleService {
  /**
   * Finds the Asset and Manifest documents that reference each CID.
   * Assets in `excludeAssetIds` (e.g. the asset being deleted) are ignored.
   */
  private async findReferences(
    cids: string[],
    excludeAssetIds: mongoose.Types.ObjectId[] = []
  ): Promise<Map<string, CidReferences>> {
    const references = new Map<string, CidReferences>(
      cids.map((cid) => [cid, { assetIds: [], manifestIds: [] }])
    );
    if (cids.length === 0) return references;

    const [assets, manifests] = await Promise.all([
      Asset.find({
        storageProvider: "ipfs",
        storageReferenceId: { $in: cids },
        _id: { $nin: excludeAssetIds },
      })
        .select("_id storageReferenceId")
        .lean()
        .exec(),
      Manifest.find({ ipfsCid: { $in: cids } })
        .select("_id ipfsCid")
        .lean()
        .exec(),
    ]);

    for (const asset of assets) {
      references.get(asset.storageReferenceId)?.assetIds.push(asset._id.toString());
    }
    for (const manifest of manifests) {
      if (manifest.ipfsCid) {
        references.get(manifest.ipfsCid)?.manifestIds.push(manifest._id.toString());
      }
    }

    return references;
  }

  /**
   * Lists Pinata pins and marks which ones are tracked by the database.
   * Untracked pins are candidates for manual release.
   */
  async listPins(query: IpfsPinListQuery): Promise<TrackedIpfsPinListResult> {
    const page = await ipfsService.listPins(query);
    const references = await this.findReferences([...new Set(page.pins.map((pin: any) => pin.cid))] as string[]);

    return {
      nextPageToken: page.nextPageToken,
      pins: page.pins.map((pin: any) => {
        const refs = references.get(pin.cid) ?? { assetIds: [], manifestIds: [] };
        return {
          ...pin,
          tracked: refs.assetIds.length > 0 || refs.manifestIds.length > 0,
          trackedAssetIds: refs.assetIds,
          trackedManifestIds: refs.manifestIds,
        };
      }),
    };
  }

  async pin(input: IpfsPinInput): Promise<IpfsPinResult> {
    return ipfsService.pinMedia(input);
  }

  /**
   * Explicit unpin. Refuses with 409 while any Asset or Manifest still
   * references the CID; delete those records first.
   */
  async unpin(cid: string): Promise<IpfsUnpinResult> {
    if (!isValidCid(cid)) {
      throw new AppError(`Invalid IPFS CID: ${cid}`, StatusCodes.BAD_REQUEST, "INVALID_CID");
    }

    const refs = (await this.findReferences([cid])).get(cid);
    if (refs && (refs.assetIds.length > 0 || refs.manifestIds.length > 0)) {
      throw new AppError(
        `CID ${cid} is still referenced by ${refs.assetIds.length} asset(s) and ` +
          `${refs.manifestIds.length} manifest(s)`,
        StatusCodes.CONFLICT,
        "CID_IN_USE"
      );
    }

    const result = await ipfsService.unpinCid(cid);
    logger.info("IPFS pin released", { cid, fileIds: result.fileIds, unpinned: result.unpinned });
    return result;
  }

  /**
   * Releases the pin for `cid` unless another record still depends on it.
   * Used by asset deletion and the orphan cleanup job. Pinata failures
   * propagate so callers can keep the DB record and retry later.
   */
  async releaseIfUnreferenced(
    cid: string,
    excludeAssetIds: mongoose.Types.ObjectId[] = []
  ): Promise<PinReleaseOutcome> {
    if (!isValidCid(cid)) {
      logger.warn("Skipping IPFS unpin: storage reference is not a valid CID", { cid });
      return { cid, released: false, fileIds: [], skippedReason: "invalid_cid" };
    }

    const refs = (await this.findReferences([cid], excludeAssetIds)).get(cid);
    if (refs && (refs.assetIds.length > 0 || refs.manifestIds.length > 0)) {
      logger.info("Keeping IPFS pin: CID is still referenced", {
        cid,
        assetIds: refs.assetIds,
        manifestIds: refs.manifestIds,
      });
      return { cid, released: false, fileIds: [], skippedReason: "referenced" };
    }

    const result = await ipfsService.unpinCid(cid);
    logger.info("IPFS pin released", { cid, fileIds: result.fileIds, unpinned: result.unpinned });
    return { cid, released: result.unpinned, fileIds: result.fileIds };
  }
}

export const pinLifecycleService = new PinLifecycleService();
