import { Request, Response } from 'express';
import { generateApiKeyForUser } from '../services/developer.service';

export const generateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized. User ID required.' });
      return;
    }

    const plainTextApiKey = await generateApiKeyForUser(userId);
    
    res.status(201).json({
      success: true,
      message: 'API key generated successfully.',
      key: plainTextApiKey
    });
  } catch (error: any) {
    console.error('[API Key Error]', error);
    if (error.message === 'User not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
