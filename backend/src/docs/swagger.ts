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

