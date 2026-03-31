import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { verificationService } from '../services/verification.service';
import { HttpError } from '../utils/httpError';

interface MintCallbackRequestBody {
  transactionHash?: string;
  certificateId?: string;
  contractAddress?: string;
  ledgerSequence?: number;
  mintedAt?: string;
  stellarNetwork?: 'testnet' | 'mainnet';
}

export const handleMintCallback = async (
  req: Request<{ jobId: string }, unknown, MintCallbackRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new HttpError(400, 'Invalid job id');
    }

    const { transactionHash, certificateId, contractAddress, ledgerSequence, mintedAt, stellarNetwork } = req.body;

    if (!transactionHash || !transactionHash.trim()) {
      throw new HttpError(400, 'transactionHash is required');
    }

    if (!certificateId || !certificateId.trim()) {
      throw new HttpError(400, 'certificateId is required');
    }

    if (!contractAddress || !contractAddress.trim()) {
      throw new HttpError(400, 'contractAddress is required');
    }

    if (!Number.isInteger(ledgerSequence) || (ledgerSequence ?? 0) <= 0) {
      throw new HttpError(400, 'ledgerSequence must be a positive integer');
    }
    const parsedLedgerSequence = Number(ledgerSequence);

    if (stellarNetwork && stellarNetwork !== 'testnet' && stellarNetwork !== 'mainnet') {
      throw new HttpError(400, 'stellarNetwork must be either testnet or mainnet');
    }

    const mintedAtDate = mintedAt ? new Date(mintedAt) : new Date();
    if (Number.isNaN(mintedAtDate.getTime())) {
      throw new HttpError(400, 'mintedAt must be a valid ISO date');
    }

    const result = await verificationService.handleMintCallback({
      jobId,
      transactionHash: transactionHash.trim(),
      certificateId: certificateId.trim(),
      contractAddress: contractAddress.trim(),
      ledgerSequence: parsedLedgerSequence,
      mintedAt: mintedAtDate,
      stellarNetwork,
    });

    res.status(200).json({
      status: 'success',
      message: 'Verification job completed and certificate cache created',
      data: {
        verificationJob: result.verificationJob,
        certificate: result.certificate,
        webhookDispatched: result.webhookDispatched,
      },
    });
  } catch (error) {
    next(error);
  }
};
