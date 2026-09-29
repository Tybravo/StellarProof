import { Router } from 'express';
import * as teeConfigController from '../controllers/teeConfig.controller';
import { jwtMiddleware } from '../middlewares/jwt.middleware';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

/**
 * TEE Configuration Routes
 * Base path: /api/v1/tee-config
 */

// ── Validation schemas ──
const createTEEConfigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  codeMeasurementHash: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid SHA-256 hash format'),
  workerBinaryHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, 'Invalid SHA-256 hash format')
    .optional(),
  enclaveBinaryHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, 'Invalid SHA-256 hash format')
    .optional(),
  version: z.string().min(1, 'Version is required').max(50),
  environment: z.enum(['testnet', 'mainnet', 'development']),
});

const updateTEEConfigSchema = z.object({
  description: z.string().max(1000).optional(),
  version: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  isDeprecated: z.boolean().optional(),
});

const computeHashSchema = z.object({
  workerBinaryB64: z.string().min(1, 'Worker binary (base64) is required'),
  enclaveBinaryB64: z.string().min(1, 'Enclave binary (base64) is required'),
});

// ── Public Routes ──

/**
 * POST /api/v1/tee-config/create
 * Create a new TEE configuration
 */
router.post('/create', validateRequest(createTEEConfigSchema), teeConfigController.createTEEConfig);

/**
 * GET /api/v1/tee-config/active/:environment
 * Get the active TEE configuration for a specific environment
 */
router.get('/active/:environment', teeConfigController.getActiveTEEConfig);

/**
 * GET /api/v1/tee-config/hash/:codeMeasurementHash
 * Get a TEE configuration by code measurement hash
 */
router.get('/hash/:codeMeasurementHash', teeConfigController.getTEEConfigByHash);

/**
 * GET /api/v1/tee-config
 * List all TEE configurations with optional filtering
 */
router.get('/', teeConfigController.listTEEConfigs);

/**
 * GET /api/v1/tee-config/:id
 * Get a TEE configuration by ID
 */
router.get('/:id', teeConfigController.getTEEConfigById);

// ── Protected Routes (JWT required) ──

/**
 * PATCH /api/v1/tee-config/:id
 * Update a TEE configuration
 */
router.patch('/:id', jwtMiddleware, validateRequest(updateTEEConfigSchema), teeConfigController.updateTEEConfig);

/**
 * POST /api/v1/tee-config/:id/deprecate
 * Deprecate a TEE configuration
 */
router.post('/:id/deprecate', jwtMiddleware, teeConfigController.deprecateTEEConfig);

/**
 * DELETE /api/v1/tee-config/:id
 * Delete a TEE configuration
 */
router.delete('/:id', jwtMiddleware, teeConfigController.deleteTEEConfig);

/**
 * POST /api/v1/tee-config/compute-hash
 * Utility endpoint: Compute code measurement hash from binary data
 */
router.post('/compute-hash', validateRequest(computeHashSchema), teeConfigController.computeCodeMeasurementHash);

export default router;
