import VerificationJob, { IVerificationJob } from '../models/VerificationJob.model';
import { HttpError } from '../utils/httpError';
import { certificateService, CreateCertificateInput } from './certificate.service';
import { webhookService } from './webhook.service';
import { ICertificate } from '../models/Certificate.model';

export interface MintCallbackInput {
  jobId: string;
  transactionHash: string;
  certificateId: string;
  contractAddress: string;
  ledgerSequence: number;
  mintedAt: Date;
  stellarNetwork?: 'testnet' | 'mainnet';
}

export interface MintCallbackResult {
  verificationJob: IVerificationJob;
  certificate: ICertificate;
  webhookDispatched: boolean;
}

export class VerificationService {
  async handleMintCallback(input: MintCallbackInput): Promise<MintCallbackResult> {
    const verificationJob = await VerificationJob.findById(input.jobId).exec();

    if (!verificationJob) {
      throw new HttpError(404, 'Verification job not found');
    }

    verificationJob.status = 'completed';
    verificationJob.stellarTransactionHash = input.transactionHash;
    await verificationJob.save();

    const certificateInput: CreateCertificateInput = {
      verificationJob,
      transactionHash: input.transactionHash,
      certificateId: input.certificateId,
      contractAddress: input.contractAddress,
      ledgerSequence: input.ledgerSequence,
      mintedAt: input.mintedAt,
      stellarNetwork: input.stellarNetwork,
    };

    const certificate = await certificateService.createFromVerificationJob(certificateInput);

    let webhookDispatched = false;
    if (verificationJob.webhookUrl) {
      webhookDispatched = await webhookService.dispatchVerificationCompleted(verificationJob.webhookUrl, {
        jobId: verificationJob.id,
        certificateId: certificate.id,
      });
    }

    return {
      verificationJob,
      certificate,
      webhookDispatched,
    };
  }
}

export const verificationService = new VerificationService();
