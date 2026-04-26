import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { spvService, SupportedStorageProvider } from '../services/spv.service';
import { ISPVRecord } from '../models/SPVRecord.model';
import { StatusCodes } from 'http-status-codes';

const VALID_ACCESS_TYPES: ISPVRecord['accessType'][] = [
  'private',
  'public_with_conditions',
  'nft_holders_only',
  'specific_users',
];

const VALID_STORAGE_PROVIDERS: SupportedStorageProvider[] = ['cloudinary', 'ipfs'];

export const uploadEncryptedAsset = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'No file provided. Attach the file under the "file" field as multipart/form-data.',
    });
    return;
  }

  const { accessType, nftContractAddress, storageProvider } = req.body as {
    accessType?: ISPVRecord['accessType'];
    nftContractAddress?: string;
    storageProvider?: SupportedStorageProvider;
  };

  if (!accessType || !VALID_ACCESS_TYPES.includes(accessType)) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `Invalid or missing accessType. Must be one of: ${VALID_ACCESS_TYPES.join(', ')}`,
    });
    return;
  }

  const resolvedProvider: SupportedStorageProvider =
    storageProvider && VALID_STORAGE_PROVIDERS.includes(storageProvider)
      ? storageProvider
      : 'cloudinary';

  const rawAllowedUsers: string | string[] | undefined = req.body.allowedUsers;
  const allowedUsersArray: string[] = Array.isArray(rawAllowedUsers)
    ? rawAllowedUsers
    : rawAllowedUsers
      ? [rawAllowedUsers]
      : [];

  const parsedAllowedUsers = allowedUsersArray
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  try {
    const result = await spvService.uploadEncryptedAsset({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      creatorId: new mongoose.Types.ObjectId(req.user!.id),
      storageProvider: resolvedProvider,
      accessType,
      allowedUsers: parsedAllowedUsers,
      nftContractAddress,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Asset encrypted and sealed in SPV vault successfully.',
      data: {
        spvId: result.spvRecord._id,
        assetId: result.asset._id,
        storageProvider: resolvedProvider,
        storageUrl: result.storageUrl,
        storageReferenceId: result.storageReferenceId,
        accessType: result.spvRecord.accessType,
        isSealed: result.spvRecord.isSealed,
        createdAt: result.spvRecord.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message });
  }
};

export const getSPVRecord = async (req: Request, res: Response): Promise<void> => {
  const { spvId } = req.params;

  try {
    const record = await spvService.getSPVRecord(
      spvId,
      new mongoose.Types.ObjectId(req.user!.id),
    );

    if (!record) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'SPV record not found or you do not have permission to access it.',
      });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message });
  }
};

export const getUserSPVRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await spvService.getUserSPVRecords(new mongoose.Types.ObjectId(req.user!.id));
    res.status(StatusCodes.OK).json({ success: true, data: records });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message });
  }
};

export const updateSealedStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isSealed } = req.body;

  if (typeof isSealed !== 'boolean') {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'isSealed must be a boolean value.',
    });
    return;
  }

  try {
    const record = await spvService.updateSealedStatus(
      id,
      isSealed,
      new mongoose.Types.ObjectId(req.user!.id),
    );

    if (!record) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'SPV record not found or you do not have permission to modify it.',
      });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message });
  }
};