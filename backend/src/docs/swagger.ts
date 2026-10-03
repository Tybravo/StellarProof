import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StellarProof API',
      version: '1.0.0',
      description: 'API documentation for StellarProof — blockchain-powered provenance platform',
      contact: {
        name: 'StellarProof Team',
      },
    },
    
    servers: [
  {
    url: 'http://localhost:4000',  
    description: 'Development server',
  },
],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        HealthCheckResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2026-04-21T16:00:00.000Z',
            },
            uptime: {
              type: 'number',
              example: 123.45,
            },
            database: {
              type: 'string',
              enum: ['connected', 'disconnected'],
              example: 'connected',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Something went wrong',
            },
          },
        },
        VerificationJob: {
          type: 'object',
          required: [ 'ownerPublicKey', 'contentHash', 'status' ],
          properties: {
            _id: { type: 'string', example: '665f1f0d8f1d4d3a4f2d7c10' },
            ownerPublicKey: { type: 'string', example: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' },
            contentHash: { type: 'string', pattern: '^[a-fA-F0-9]{64}$' },
            status: { type: 'string', enum: [ 'pending', 'processing', 'tee_verifying', 'minting', 'completed', 'failed' ] },
            errorMessage: { type: 'string' },
            timeline: { type: 'array', items: { type: 'object', properties: { stage: { type: 'string' }, at: { type: 'string', format: 'date-time' } } } },
          },
        },
        VerificationJobCreate: {
          type: 'object', required: [ 'ownerPublicKey', 'contentHash' ],
          properties: {
            ownerPublicKey: { type: 'string', description: 'Stellar G-address' },
            contentHash: { type: 'string', pattern: '^[a-fA-F0-9]{64}$' },
            webhookUrl: { type: 'string', format: 'uri' },
          },
        },
        VerificationStatusUpdate: {
          type: 'object', required: [ 'status' ],
          properties: {
            status: { type: 'string', enum: [ 'processing', 'tee_verifying', 'minting', 'completed', 'failed' ] },
            errorMessage: { type: 'string' },
            teeAttestationHash: { type: 'string' },
            teeSignature: { type: 'string' },
            codeMeasurementHash: { type: 'string' },
            stellarTransactionHash: { type: 'string' },
          },
        },
        OracleCallback: {
          type: 'object', required: [ 'jobId', 'teeAttestationHash', 'teeSignature' ],
          properties: {
            jobId: { type: 'string' },
            teeAttestationHash: { type: 'string', pattern: '^[a-fA-F0-9]{64}$' },
            teeSignature: { type: 'string' },
          },
        },
      },
    },
  },
  // Points to your route files where @swagger JSDoc comments live
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Serve Swagger UI at /api-docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'StellarProof API Docs',
    swaggerOptions: {
      persistAuthorization: true, // keeps JWT token between page refreshes
    },
  }));

  // Expose raw JSON spec at /api-docs.json (useful for codegen tools)
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger docs available at "http://localhost:4000/api-docs"');
}
