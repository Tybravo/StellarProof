
# Frontend TypeScript Configuration and Strict Mode

## Overview

StellarProof uses TypeScript to improve code reliability, maintainability, and developer experience across the frontend application.

The frontend TypeScript configuration is maintained in:

`frontend/tsconfig.json`

The project uses TypeScript 5 with strict type checking enabled.

This document explains the existing configuration and establishes conventions for contributors.

## 1. TypeScript Configuration

The current configuration is:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

This configuration is documented as the current project baseline. Contributors should not change compiler options merely to suppress existing type errors.

## 2. Configuration Rationale

| Option | Current value | Purpose |
| --- | --- | --- |
| `target` | `ES2017` | Defines the JavaScript language target |
| `lib` | DOM, DOM.Iterable, ESNext | Provides browser and modern JavaScript type definitions |
| `allowJs` | `true` | Allows JavaScript files to coexist with TypeScript |
| `skipLibCheck` | `true` | Skips declaration-file checking in dependencies |
| `strict` | `true` | Enables strict TypeScript type checking |
| `noEmit` | `true` | Prevents TypeScript from emitting compiled files |
| `esModuleInterop` | `true` | Improves compatibility with CommonJS-style imports |
| `module` | `esnext` | Supports modern JavaScript module syntax |
| `moduleResolution` | `bundler` | Resolves modules using bundler-compatible rules |
| `resolveJsonModule` | `true` | Allows importing JSON modules |
| `isolatedModules` | `true` | Ensures compatibility with single-file transpilation |
| `jsx` | `react-jsx` | Uses the modern React JSX transform |
| `incremental` | `true` | Enables incremental compilation |
| `plugins` | Next.js | Enables Next.js TypeScript integration |
| `paths` | `@/*` | Provides the frontend root alias |

## 3. Strict Mode

The most important setting is:

```json
{
  "strict": true
}
```

Strict mode enables a collection of TypeScript checks that help identify potentially unsafe code during development.

Contributors should write code that satisfies strict mode rather than weakening the compiler configuration.

### 3.1 Avoid implicit any

Provide meaningful types instead of allowing variables or function parameters to become implicitly typed as `any`.

Preferred:

```ts
interface VerificationResult {
  verified: boolean;
  transactionHash: string;
}

function getVerificationResult(
  result: VerificationResult
): boolean {
  return result.verified;
}
```

Avoid:

```ts
function getVerificationResult(result: any) {
  return result.verified;
}
```

### 3.2 Handle nullable values

Account for values that can legitimately be `null` or `undefined`.

Preferred:

```ts
function getWalletAddress(
  address: string | null
): string {
  return address ?? "Wallet not connected";
}
```

Avoid assuming that a value is always available.

### 3.3 Use explicit return types where beneficial

Add explicit return types to reusable functions, service methods, public interfaces, and complex utilities when doing so improves clarity.

```ts
interface WalletAccount {
  address: string;
  network: string;
}

function getWalletAccount(): WalletAccount | null {
  // Implementation
  return null;
}
```

Simple component functions may use inferred return types when the resulting type is clear.

### 3.4 Narrow unknown values

Use `unknown` instead of `any` when handling values whose types are not known.

```ts
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}
```

### 3.5 Handle optional properties

Check optional properties before using them.

```ts
interface Certificate {
  id: string;
  transactionHash?: string;
}

function getTransactionHash(
  certificate: Certificate
): string {
  return certificate.transactionHash ?? "Not available";
}
```

## 4. Type and Interface Conventions

Use descriptive names for types and interfaces.

Recommended conventions:

| Type | Naming convention | Example |
| --- | --- | --- |
| Interfaces | PascalCase | `WalletAccount` |
| Types | PascalCase | `VerificationStatus` |
| Enums | PascalCase | `TransactionStatus` |
| Functions | camelCase | `fetchCertificate` |
| Variables | camelCase | `walletAddress` |
| Constants | UPPER_SNAKE_CASE for fixed constants | `MAX_RETRY_COUNT` |
| React components | PascalCase | `CertificateCard` |
| Hooks | camelCase with `use` prefix | `useWallet` |

Use interfaces for object contracts that may be extended or implemented.

Use type aliases for unions, intersections, utility types, and other flexible type compositions.

Example:

```ts
interface Wallet {
  address: string;
  connected: boolean;
}

type Network = "mainnet" | "testnet" | "futurenet";
```

## 5. React and Next.js TypeScript Conventions

Use typed props for React components.

```tsx
interface CertificateCardProps {
  certificateId: string;
  verified: boolean;
}

export default function CertificateCard({
  certificateId,
  verified,
}: CertificateCardProps) {
  return (
    <div>
      <p>{certificateId}</p>
      <p>{verified ? "Verified" : "Unverified"}</p>
    </div>
  );
}
```

Additional guidelines:

- Use `React.ReactNode` for general renderable children where appropriate.
- Use appropriate React event types when event handlers need explicit annotations.
- Keep client-side component directives (`"use client"`) when browser APIs, state, effects, or client-only hooks require them.
- Use server components by default where client-side functionality is unnecessary.
- Use `import type` for imports that are needed only for TypeScript types.
- Follow the existing Next.js App Router conventions.

## 6. API and Service Types

Define explicit types for API request and response data.

Avoid using unstructured objects when the expected data shape is known.

Example:

```ts
interface VerificationRequest {
  contentHash: string;
  network: string;
}

interface VerificationResponse {
  requestId: string;
  status: string;
  transactionHash?: string;
}
```

Service methods should communicate their expected input and output types.

When handling API responses, validate or narrow external data before treating it as a trusted application type.

Do not assume that a TypeScript assertion validates the actual API response.

## 7. State Management Types

The frontend uses Zustand for application state.

Store state, actions, and update functions should have explicit and consistent types.

Reference implementation:

`frontend/features/verification/store/wizard.store.ts`

Guidelines:

- Define store state interfaces.
- Type action parameters and return values.
- Use `Partial<T>` only where partial updates are intentional.
- Keep state updates immutable.
- Avoid introducing unnecessary duplicate state.
- Ensure persisted state is handled safely during hydration.

## 8. Import and Path Conventions

The frontend supports the `@/*` alias.

Example:

```ts
import Button from "@/components/ui/Button";
import type { WalletAccount } from "@/types/wallet";
```

Use the alias for frontend-root imports where appropriate.

Prefer type-only imports when importing types exclusively.

Keep imports organized and consistent with the surrounding file.

## 9. Type Safety Best Practices

Contributors should:

- Avoid unnecessary use of `any`.
- Prefer `unknown` for untrusted values.
- Avoid unsafe type assertions.
- Avoid non-null assertions unless the guarantee is established.
- Handle nullable and optional properties.
- Define reusable interfaces and type aliases.
- Keep API contracts explicit.
- Avoid duplicating existing type definitions.
- Keep types close to their relevant feature or domain when appropriate.

## 10. TypeScript Validation

The frontend provides these scripts in `frontend/package.json`:

```bash
pnpm --filter web run lint
pnpm --filter web run build
```

The repository CI workflow also runs the frontend lint and production build.

To run a direct TypeScript check when needed:

```bash
pnpm --dir frontend exec tsc --noEmit
```

The direct compiler check supplements the repository's existing lint and build workflow.

Before submitting frontend changes:

- [ ] TypeScript strict mode remains enabled.
- [ ] New code has appropriate types.
- [ ] No unintended implicit `any` types are introduced.
- [ ] Nullable and optional values are handled.
- [ ] API responses are handled safely.
- [ ] Existing imports and aliases resolve correctly.
- [ ] Frontend lint passes.
- [ ] Frontend production build passes.

## Related Configuration and Implementation Files

- `frontend/tsconfig.json`
- `frontend/package.json`
- `frontend/features/verification/store/wizard.store.ts`
- `frontend/context/QueryProvider.tsx`
- `frontend/services/`
- `frontend/app/`
