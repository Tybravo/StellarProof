import { Request, Response } from 'express';
import { kmsService } from '../services/kms.service';

export const rotateKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const result = await kmsService.rotateKey(userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const getAllKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const keys = await kmsService.getAllKeys(userId);
    res.status(200).json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const getActiveKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const key = await kmsService.getActiveKey(userId);
    res.status(200).json({ success: true, data: key });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const revokeKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { keyId } = req.params;
    const key = await kmsService.revokeKey(keyId);
    res.status(200).json({ success: true, data: key });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};