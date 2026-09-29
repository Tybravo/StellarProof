import crypto from 'crypto';
import TEEConfig, { ITEEConfig } from '../models/TEEConfig.model';
import { AppError } from '../errors/AppError';

export interface CreateTEEConfigInput {
  name: string;
  description?: string;
  codeMeasurementHash?: string; // If not provided, compute from binaries
  workerBinary?: Buffer;
  enclaveBinary?: Buffer;
  workerBinaryHash?: string;
  enclaveBinaryHash?: string;
  version: string;
  environment: 'testnet' | 'mainnet' | 'development';
  createdBy?: string; // User ID
}

export interface UpdateTEEConfigInput {
  description?: string;
  version?: string;
  isActive?: boolean;
  isDeprecated?: boolean;
}

export interface TEEConfigResponse {
  id: string;
  name: string;
  description?: string;
  codeMeasurementHash: string;
  workerBinaryHash?: string;
  enclaveBinaryHash?: string;
  version: string;
  environment: string;
  isActive: boolean;
  isDeprecated: boolean;
  activatedAt?: Date;
  deprecatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TEEConfigService {
  /**
   * Compute code measurement hash from worker and enclave binary data
   * SHA-256 hash of concatenated binaries
   */
  computeCodeMeasurementHash(workerBinary: Buffer, enclaveBinary: Buffer): string {
    if (!workerBinary || !enclaveBinary) {
      throw new AppError('Both worker and enclave binaries are required', 400, 'MISSING_BINARIES');
    }
    const combined = Buffer.concat([workerBinary, enclaveBinary]);
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Compute individual binary hash
   */
  computeBinaryHash(binary: Buffer): string {
    if (!binary) {
      throw new AppError('Binary data is required', 400, 'MISSING_BINARY');
    }
    return crypto.createHash('sha256').update(binary).digest('hex');
  }

  /**
   * Create a new TEE configuration
   */
  async createTEEConfig(input: CreateTEEConfigInput): Promise<TEEConfigResponse> {
    const {
      name,
      description,
      codeMeasurementHash: providedHash,
      workerBinary,
      enclaveBinary,
      workerBinaryHash,
      enclaveBinaryHash,
      version,
      environment,
      createdBy,
    } = input;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      throw new AppError('TEE config name is required and must be a string', 400, 'INVALID_NAME');
    }

    if (!version || typeof version !== 'string') {
      throw new AppError('Version is required and must be a string', 400, 'INVALID_VERSION');
    }

    if (!environment || !['testnet', 'mainnet', 'development'].includes(environment)) {
      throw new AppError(
        'Environment must be one of: testnet, mainnet, development',
        400,
        'INVALID_ENVIRONMENT'
      );
    }

    // Determine code measurement hash
    let finalCodeMeasurementHash = providedHash;

    if (!finalCodeMeasurementHash) {
      if (!workerBinary || !enclaveBinary) {
        throw new AppError(
          'Either codeMeasurementHash or both workerBinary and enclaveBinary must be provided',
          400,
          'MISSING_HASH_INPUT'
        );
      }
      finalCodeMeasurementHash = this.computeCodeMeasurementHash(workerBinary, enclaveBinary);
    }

    // Validate hash format
    if (!/^[a-f0-9]{64}$/i.test(finalCodeMeasurementHash)) {
      throw new AppError(
        'Code measurement hash must be a valid SHA-256 hex string (64 characters)',
        400,
        'INVALID_HASH_FORMAT'
      );
    }

    // Check if this hash already exists
    const existingConfig = await TEEConfig.findOne({ codeMeasurementHash: finalCodeMeasurementHash });
    if (existingConfig) {
      throw new AppError(
        `A TEE config with this code measurement hash already exists: ${existingConfig.name}`,
        409,
        'HASH_EXISTS'
      );
    }

    // Check if name already exists
    const existingName = await TEEConfig.findOne({ name: name.trim() });
    if (existingName) {
      throw new AppError(`A TEE config with name "${name}" already exists`, 409, 'NAME_EXISTS');
    }

    // Compute binary hashes if binaries are provided
    let finalWorkerBinaryHash = workerBinaryHash;
    let finalEnclaveBinaryHash = enclaveBinaryHash;

    if (workerBinary) {
      finalWorkerBinaryHash = this.computeBinaryHash(workerBinary);
    }

    if (enclaveBinary) {
      finalEnclaveBinaryHash = this.computeBinaryHash(enclaveBinary);
    }

    // Create and save the TEE config
    const teeConfig = new TEEConfig({
      name: name.trim(),
      description: description?.trim(),
      codeMeasurementHash: finalCodeMeasurementHash,
      workerBinaryHash: finalWorkerBinaryHash,
      enclaveBinaryHash: finalEnclaveBinaryHash,
      version: version.trim(),
      environment,
      createdBy: createdBy || undefined,
      isActive: true,
      isDeprecated: false,
    });

    await teeConfig.save();

    return this.formatTEEConfigResponse(teeConfig);
  }

  /**
   * Get the active TEE config for a specific environment
   */
  async getActiveTEEConfig(environment: 'testnet' | 'mainnet' | 'development'): Promise<TEEConfigResponse | null> {
    if (!environment || !['testnet', 'mainnet', 'development'].includes(environment)) {
      throw new AppError('Valid environment is required', 400, 'INVALID_ENVIRONMENT');
    }

    const config = await TEEConfig.findOne({
      environment,
      isActive: true,
      isDeprecated: false,
    })
      .sort({ updatedAt: -1 })
      .exec();

    return config ? this.formatTEEConfigResponse(config) : null;
  }

  /**
   * Get a TEE config by ID
   */
  async getTEEConfigById(id: string): Promise<TEEConfigResponse | null> {
    if (!id) {
      throw new AppError('TEE config ID is required', 400, 'MISSING_ID');
    }

    const config = await TEEConfig.findById(id).exec();
    return config ? this.formatTEEConfigResponse(config) : null;
  }

  /**
   * Get a TEE config by code measurement hash
   */
  async getTEEConfigByHash(codeMeasurementHash: string): Promise<TEEConfigResponse | null> {
    if (!codeMeasurementHash) {
      throw new AppError('Code measurement hash is required', 400, 'MISSING_HASH');
    }

    if (!/^[a-f0-9]{64}$/i.test(codeMeasurementHash)) {
      throw new AppError('Invalid hash format', 400, 'INVALID_HASH_FORMAT');
    }

    const config = await TEEConfig.findOne({ codeMeasurementHash: codeMeasurementHash.toLowerCase() }).exec();
    return config ? this.formatTEEConfigResponse(config) : null;
  }

  /**
   * List all TEE configs with optional filtering
   */
  async listTEEConfigs(filters?: {
    environment?: string;
    isActive?: boolean;
    isDeprecated?: boolean;
  }): Promise<TEEConfigResponse[]> {
    const query: any = {};

    if (filters?.environment) {
      if (!['testnet', 'mainnet', 'development'].includes(filters.environment)) {
        throw new AppError('Invalid environment filter', 400, 'INVALID_ENVIRONMENT');
      }
      query.environment = filters.environment;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.isDeprecated !== undefined) {
      query.isDeprecated = filters.isDeprecated;
    }

    const configs = await TEEConfig.find(query)
      .sort({ createdAt: -1 })
      .exec();

    return configs.map(config => this.formatTEEConfigResponse(config));
  }

  /**
   * Update a TEE config
   */
  async updateTEEConfig(id: string, input: UpdateTEEConfigInput): Promise<TEEConfigResponse> {
    if (!id) {
      throw new AppError('TEE config ID is required', 400, 'MISSING_ID');
    }

    const config = await TEEConfig.findById(id).exec();
    if (!config) {
      throw new AppError('TEE config not found', 404, 'NOT_FOUND');
    }

    // Update allowed fields
    if (input.description !== undefined) {
      config.description = input.description?.trim();
    }

    if (input.version !== undefined) {
      config.version = input.version.trim();
    }

    if (input.isActive !== undefined) {
      config.isActive = input.isActive;
    }

    if (input.isDeprecated !== undefined) {
      config.isDeprecated = input.isDeprecated;
    }

    await config.save();

    return this.formatTEEConfigResponse(config);
  }

  /**
   * Deprecate a TEE config (mark as deprecated)
   */
  async deprecateTEEConfig(id: string): Promise<TEEConfigResponse> {
    if (!id) {
      throw new AppError('TEE config ID is required', 400, 'MISSING_ID');
    }

    const config = await TEEConfig.findById(id).exec();
    if (!config) {
      throw new AppError('TEE config not found', 404, 'NOT_FOUND');
    }

    if (config.isDeprecated) {
      throw new AppError('TEE config is already deprecated', 400, 'ALREADY_DEPRECATED');
    }

    config.isDeprecated = true;
    config.isActive = false;
    config.deprecatedAt = new Date();

    await config.save();

    return this.formatTEEConfigResponse(config);
  }

  /**
   * Delete a TEE config (only if not active)
   */
  async deleteTEEConfig(id: string): Promise<void> {
    if (!id) {
      throw new AppError('TEE config ID is required', 400, 'MISSING_ID');
    }

    const config = await TEEConfig.findById(id).exec();
    if (!config) {
      throw new AppError('TEE config not found', 404, 'NOT_FOUND');
    }

    if (config.isActive) {
      throw new AppError('Cannot delete an active TEE config', 400, 'CONFIG_ACTIVE');
    }

    await TEEConfig.deleteOne({ _id: id }).exec();
  }

  /**
   * Format TEE config document for API response
   */
  private formatTEEConfigResponse(config: ITEEConfig): TEEConfigResponse {
    return {
      id: config._id.toString(),
      name: config.name,
      description: config.description,
      codeMeasurementHash: config.codeMeasurementHash,
      workerBinaryHash: config.workerBinaryHash,
      enclaveBinaryHash: config.enclaveBinaryHash,
      version: config.version,
      environment: config.environment,
      isActive: config.isActive,
      isDeprecated: config.isDeprecated,
      activatedAt: config.activatedAt,
      deprecatedAt: config.deprecatedAt,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}

export const teeConfigService = new TEEConfigService();
