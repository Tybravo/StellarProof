# Winston Logger Usage Guide

## Overview

The application now uses **Winston** for structured, level-based logging instead of `console.log`. This provides better log management, environment-aware configurations, and production-ready log handling.

## Features

- ✅ **Structured Logging**: JSON-formatted logs with timestamps and metadata
- ✅ **Log Levels**: `error`, `warn`, `info`, `debug`
- ✅ **Environment-Aware**:
  - **Development**: Console output with colors and human-readable format
  - **Production**: File-based logging with rotation (5 files max, 5MB each)
- ✅ **Exception Handling**: Catches uncaught exceptions and unhandled rejections
- ✅ **Metadata Support**: Include additional context in logs

## Installation

Winston is configured but needs to be installed if not already present:

```bash
pnpm add winston
```

## Basic Usage

```typescript
import logger from "./utils/logger";

// Info level
logger.info("User logged in", { userId: "123", email: "user@example.com" });

// Warning level
logger.warn("High memory usage detected", { memoryMB: 512 });

// Error level
logger.error("Database connection failed", { error: err.message });

// Debug level (dev only)
logger.debug("Processing request", { endpoint: "/api/users" });
```

## Log Output Examples

### Development (Console)

```
[2026-04-29 14:32:15] info: User logged in {"userId":"123","email":"user@example.com"}
[2026-04-29 14:32:16] warn: High memory usage detected {"memoryMB":512}
[2026-04-29 14:32:17] error: Database connection failed {"error":"ECONNREFUSED"}
```

### Production (File-based)

```json
{
  "message": "User logged in",
  "level": "info",
  "timestamp": "2026-04-29 14:32:15",
  "userId": "123",
  "email": "user@example.com",
  "service": "stellarproof-backend"
}
```

## Log Files (Production)

Logs are stored in the `backend/logs/` directory:

- **combined.log**: All logs (info level and above)
- **error.log**: Errors only
- **warn.log**: Warnings only
- **exceptions.log**: Uncaught exceptions
- **rejections.log**: Unhandled promise rejections

Each file is automatically rotated when it reaches 5MB, keeping up to 5 versions.

## Environment Configuration

Set `NODE_ENV` to control logging behavior:

```bash
# Development (console output, debug level)
NODE_ENV=development npm run dev

# Production (file-based, info level)
NODE_ENV=production npm start
```

## Migrating from Old Logger

Replace old-style logging:

```typescript
// ❌ Old
import { logger } from "./utils/logger";
logger.info("message", metadata);

// ✅ New
import logger from "./utils/logger";
logger.info("message", metadata);
```

The API remains the same, but the implementation now uses Winston.

## Best Practices

1. **Use appropriate log levels**:
   - `error`: Application errors that need attention
   - `warn`: Potentially harmful situations
   - `info`: Important application state changes
   - `debug`: Detailed debugging information

2. **Include context**: Add relevant metadata

   ```typescript
   logger.error("Payment failed", {
     transactionId: tx.id,
     amount: tx.amount,
     error: err.message,
   });
   ```

3. **Don't log sensitive data**: Avoid logging passwords, tokens, or PII

   ```typescript
   // ❌ Bad
   logger.info("User created", { password, apiKey });

   // ✅ Good
   logger.info("User created", { userId, email });
   ```

4. **Use structured metadata**: Keep logs queryable
   ```typescript
   logger.info("Request processed", {
     statusCode: 200,
     duration: 145,
     endpoint: "/api/verify",
   });
   ```

## Git Workflow

To work on this feature:

```bash
git checkout -b feat/winston-logger
# Make changes...
git add .
git commit -m "feat: integrate Winston logger"
git push origin feat/winston-logger
```

## Troubleshooting

**Problem**: Logs not appearing in production

- Check `NODE_ENV=production` is set
- Verify `backend/logs/` directory exists with write permissions

**Problem**: TypeScript errors

- Install type definitions: `pnpm add -D @types/winston`

**Problem**: File rotation not working

- Check file permissions in `logs/` directory
- Verify `maxFiles` and `maxsize` settings in logger.ts

## Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [StellarProof Backend Setup](../README.md)
