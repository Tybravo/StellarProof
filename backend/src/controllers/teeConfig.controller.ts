import { Request, Response, NextFunction } from 'express';
import { teeConfigService } from '../services/teeConfig.service';
import { AppError } from '../errors/AppError';

/**
 * POST /api/v1/tee-config/create
 * Create a new TEE configuration with code measurement hash
 */
export const createTEEConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      description,
      codeMeasurementHash,
      workerBinaryHash,
      enclaveBinaryHash,
      version,
      environment,
    } = req.body;

    // Basic input validation
    if (!name || typeof name !== 'string') {
      return next(new AppError('TEE config name is required and must be a string', 400, 'INVALID_NAME'));
    }

    if (!version || typeof version !== 'string') {
      return next(new AppError('Version is required and must be a string', 400, 'INVALID_VERSION'));
    }

    if (!environment || !['testnet', 'mainnet', 'development'].includes(environment)) {
      return next(
        new AppError(
          'Environment must be one of: testnet, mainnet, development',
          400,
          'INVALID_ENVIRONMENT'
        )
      );
    }

    if (!codeMeasurementHash || typeof codeMeasurementHash !== 'string') {
      return next(
        new AppError(
          'Code measurement hash is required and must be a string (SHA-256 hex format)',
          400,
          'INVALID_HASH'
        )
      );
    }

    const result = await teeConfigService.createTEEConfig({
      name,
      description,
      codeMeasurementHash,
      workerBinaryHash,
      enclaveBinaryHash,
      version,
      environment,
      createdBy: (req as any).user?.userId, // From JWT middleware
    });

    res.status(201).json({
      success: true,
      message: 'TEE configuration created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tee-config/active/:environment
 * Get the active TEE configuration for a specific environment
 */
export const getActiveTEEConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { environment } = req.params as { environment?: string };

    if (!environment || !['testnet', 'mainnet', 'development'].includes(environment)) {
      return next(
        new AppError(
          'Valid environment parameter is required: testnet, mainnet, or development',
          400,
          'INVALID_ENVIRONMENT'
        )
      );
    }

    const result = await teeConfigService.getActiveTEEConfig(
      environment as 'testnet' | 'mainnet' | 'development'
    );

    if (!result) {
      return next(
        new AppError(`No active TEE configuration found for environment: ${environment}`, 404, 'NOT_FOUND')
      );
    }

    res.status(200).json({
      success: true,
      message: 'Active TEE configuration retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tee-config/:id
 * Get a TEE configuration by ID
 */
export const getTEEConfigById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('TEE config ID is required', 400, 'MISSING_ID'));
    }

    const result = await teeConfigService.getTEEConfigById(id);

    if (!result) {
      return next(new AppError('TEE configuration not found', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      message: 'TEE configuration retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tee-config/hash/:codeMeasurementHash
 * Get a TEE configuration by code measurement hash
 */
export const getTEEConfigByHash = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { codeMeasurementHash } = req.params;

    if (!codeMeasurementHash) {
      return next(new AppError('Code measurement hash is required', 400, 'MISSING_HASH'));
    }

    const result = await teeConfigService.getTEEConfigByHash(codeMeasurementHash);

    if (!result) {
      return next(new AppError('TEE configuration not found for this hash', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      message: 'TEE configuration retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/tee-config
 * List all TEE configurations with optional filtering
 */
export const listTEEConfigs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { environment, isActive, isDeprecated } = req.query;

    const filters: any = {};

    if (environment) {
      filters.environment = environment;
    }

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (isDeprecated !== undefined) {
      filters.isDeprecated = isDeprecated === 'true';
    }

    const results = await teeConfigService.listTEEConfigs(filters);

    res.status(200).json({
      success: true,
      message: `Retrieved ${results.length} TEE configurations`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/tee-config/:id
 * Update a TEE configuration
 */
export const updateTEEConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { description, version, isActive, isDeprecated } = req.body;

    if (!id) {
      return next(new AppError('TEE config ID is required', 400, 'MISSING_ID'));
    }

    const result = await teeConfigService.updateTEEConfig(id, {
      description,
      version,
      isActive,
      isDeprecated,
    });

    res.status(200).json({
      success: true,
      message: 'TEE configuration updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/tee-config/:id/deprecate
 * Deprecate a TEE configuration
 */
export const deprecateTEEConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('TEE config ID is required', 400, 'MISSING_ID'));
    }

    const result = await teeConfigService.deprecateTEEConfig(id);

    res.status(200).json({
      success: true,
      message: 'TEE configuration deprecated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/tee-config/:id
 * Delete a TEE configuration (only if not active)
 */
export const deleteTEEConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError('TEE config ID is required', 400, 'MISSING_ID'));
    }

    await teeConfigService.deleteTEEConfig(id);

    res.status(200).json({
      success: true,
      message: 'TEE configuration deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/tee-config/compute-hash
 * Compute code measurement hash from binary data
 * This is a utility endpoint for testing/validation
 */
export const computeCodeMeasurementHash = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In a real scenario, you would accept file uploads via multipart/form-data
    // For now, we accept base64-encoded binaries in the request body
    const { workerBinaryB64, enclaveBinaryB64 } = req.body;

    if (!workerBinaryB64 || !enclaveBinaryB64) {
      return next(
        new AppError(
          'Both workerBinaryB64 and enclaveBinaryB64 are required',
          400,
          'MISSING_BINARIES'
        )
      );
    }

    const workerBinary = Buffer.from(workerBinaryB64, 'base64');
    const enclaveBinary = Buffer.from(enclaveBinaryB64, 'base64');

    const hash = teeConfigService.computeCodeMeasurementHash(workerBinary, enclaveBinary);

    res.status(200).json({
      success: true,
      message: 'Code measurement hash computed successfully',
      data: {
        codeMeasurementHash: hash,
      },
    });
  } catch (error) {
    next(error);
  }
};
