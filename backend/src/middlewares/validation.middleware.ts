import { Request, Response, NextFunction } from 'express';
import { validationService } from '../services/validation.service';

/**
 * Intercepts the raw request body stream before any JSON parsing occurs.
 * Rejects payloads that contain duplicate keys in the JSON body.
 * For valid payloads, parses and attaches the result to req.body.
 *
 * Mount this middleware INSTEAD OF express.json() for routes that require
 * strict JSON key uniqueness enforcement.
 */
export const validateNoDuplicateKeys = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const contentType = req.headers['content-type'] ?? '';

  if (!contentType.includes('application/json')) {
    next();
    return;
  }

  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    const rawBody = Buffer.concat(chunks).toString('utf8');

    if (!rawBody.trim()) {
      next();
      return;
    }

    const duplicateKey = validationService.findFirstDuplicateKey(rawBody);
    if (duplicateKey !== null) {
      res.status(400).json({
        success: false,
        message: `Duplicate key detected in JSON payload: "${duplicateKey}". Each key must be unique within a JSON object.`,
      });
      return;
    }

    try {
      req.body = JSON.parse(rawBody);
    } catch {
      res.status(400).json({
        success: false,
        message: 'Malformed JSON payload. Please ensure the request body is valid JSON.',
      });
      return;
    }

    next();
  });

  req.on('error', () => {
    res.status(400).json({
      success: false,
      message: 'Failed to read request body stream.',
    });
  });
};
