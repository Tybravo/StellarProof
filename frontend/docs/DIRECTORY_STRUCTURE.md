
# Frontend Project Directory Structure

This document describes the organization of the StellarProof frontend, the responsibilities of its main directories, and how application code is structured.

The frontend application is located in:

```text
StellarProof/frontend/
```

## 1. High-Level Directory Structure

```text
frontend/
├── app/
│   ├── api/
│   ├── builder/
│   ├── certificate/
│   ├── checkout/
│   ├── connect/
│   ├── contact/
│   ├── context/
│   ├── creators/
│   ├── dashboard/
│   ├── forget-password/
│   ├── governance/
│   ├── launch/
│   ├── login/
│   ├── manifest/
│   ├── pricing/
│   ├── product/
│   ├── register/
│   ├── registry/
│   ├── report-issue/
│   ├── search/
│   ├── skeleton-demo/
│   ├── stepper-demo/
│   ├── vault/
│   ├── verify-new-password/
│   ├── verify-password/
│   ├── verify/
│   ├── wallet/
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
│
├── components/
│   ├── auth/
│   ├── billing/
│   ├── certificate/
│   ├── checkout/
│   ├── common/
│   ├── dashboard/
│   ├── dev/
│   ├── governance/
│   ├── layout/
│   ├── manifest/
│   ├── notifications/
│   ├── registry/
│   ├── search/
│   ├── spv/
│   ├── ui/
│   ├── upload/
│   ├── vault/
│   ├── wallet/
│   ├── web3/
│   ├── wizard/
│   └── shared component files
│
├── config/
│   ├── network.ts
│   └── plans.ts
│
├── context/
│   ├── QueryProvider.tsx
│   ├── ToastContext.tsx
│   ├── WalletContext.tsx
│   ├── WizardContext.tsx
│   └── __tests__/
│
├── features/
│   └── verification/
│       ├── components/
│       ├── hooks/
│       ├── schemas/
│       ├── store/
│       ├── types/
│       ├── utils/
│       ├── __tests__/
│       ├── mediaValidation.ts
│       └── PROCESSING_INTEGRATION.md
│
├── hooks/
│   ├── __tests__/
│   ├── useBuildMintTx.ts
│   ├── useGasFeeEstimate.ts
│   ├── usePollAttestation.ts
│   ├── usePollContractEvents.ts
│   ├── useSignTransaction.ts
│   ├── useSignVoteTx.ts
│   ├── useSpvUpdates.ts
│   └── useVerificationStatus.ts
│
├── services/
│   ├── __tests__/
│   ├── assetService.ts
│   ├── auth.ts
│   ├── billingService.ts
│   ├── certificate.ts
│   ├── creatorService.ts
│   ├── governanceService.ts
│   ├── horizonService.ts
│   ├── ipfsService.ts
│   ├── manifestUseCases.ts
│   ├── oracleService.ts
│   ├── registry.ts
│   ├── stakingService.ts
│   ├── transactionService.ts
│   ├── verificationService.ts
│   ├── wallet.ts
│   └── web2DashboardService.ts
│
├── utils/
│   ├── __tests__/
│   ├── cn.ts
│   ├── crypto.ts
│   ├── downloadBlob.ts
│   ├── hashing.ts
│   ├── manifestValidation.ts
│   ├── parseSorobanEvents.ts
│   ├── validation.ts
│   └── walletErrors.ts
│
├── public/
├── figma/
├── .env.example
├── eslint.config.mjs
├── jest.config.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── setupTests.ts
├── tailwind.config.js
├── tailwind.config.ts
└── tsconfig.json
```

The tree is a representative overview of the existing architecture, not an exhaustive listing of every nested component and test file.

## 2. Core Application Directories

### 2.1 `app/`

Location:

```text
frontend/app/
```

The `app/` directory contains the Next.js App Router implementation.

Responsibilities:

- Defines application routes.
- Contains page components.
- Defines root and nested layouts.
- Contains route handlers.
- Provides application-level styles.
- Handles route-specific loading and error experiences where implemented.

Important files:

| File | Responsibility |
|---|---|
| `page.tsx` | Root homepage |
| `layout.tsx` | Root application layout |
| `globals.css` | Global application styles |
| `not-found.tsx` | Not-found page |
| `api/health/route.ts` | Health-check route handler |

See [Next.js App Router Structure](./APP_ROUTER.md) for the complete route reference.

### 2.2 `components/`

Location:

```text
frontend/components/
```

Contains reusable interface components used across the application.

Examples of responsibilities:

- Navigation and page layout.
- Authentication interfaces.
- Dashboard components.
- Wallet interfaces.
- Certificate presentation.
- Governance interfaces.
- Upload components.
- Shared UI elements.

The directory also contains reusable components such as:

```text
components/
├── Header.tsx
├── Footer.tsx
├── Navigation.tsx
├── Hero.tsx
├── ThemeToggle.tsx
├── WalletModal.tsx
└── ui/
```

Prefer extending existing reusable components instead of creating duplicate implementations.

### 2.3 `features/`

Location:

```text
frontend/features/
```

Contains feature-specific modules.

The existing verification feature is organized as follows:

```text
features/
└── verification/
    ├── components/
    ├── hooks/
    ├── schemas/
    ├── store/
    ├── types/
    ├── utils/
    ├── __tests__/
    ├── mediaValidation.ts
    └── PROCESSING_INTEGRATION.md
```

Responsibilities:

- `components/`: Components specific to verification.
- `hooks/`: Feature-specific React hooks.
- `schemas/`: Validation and data schemas.
- `store/`: Feature-specific state management.
- `types/`: Feature-specific TypeScript types.
- `utils/`: Verification-related utility functions.
- `__tests__/`: Feature tests.
- `mediaValidation.ts`: Media validation logic.

Keep feature-specific functionality within its feature module whenever appropriate.

### 2.4 `services/`

Location:

```text
frontend/services/
```

Contains service modules responsible for communicating with external systems and application APIs.

Examples:

| Service | Responsibility |
|---|---|
| `auth.ts` | Authentication-related operations |
| `billingService.ts` | Billing and subscription operations |
| `certificate.ts` | Certificate-related operations |
| `creatorService.ts` | Creator-related operations |
| `governanceService.ts` | Governance operations |
| `horizonService.ts` | Stellar Horizon interactions |
| `ipfsService.ts` | IPFS integrations |
| `registry.ts` | Registry operations |
| `stakingService.ts` | Staking operations |
| `transactionService.ts` | Transaction-related operations |
| `verificationService.ts` | Verification operations |
| `wallet.ts` | Wallet integration |
| `web2DashboardService.ts` | Web2 dashboard operations |

Services should encapsulate external communication and reusable business operations instead of placing all integration logic inside page components.

### 2.5 `stores/` and State Management

There is currently no standalone top-level directory named:

```text
frontend/stores/
```

State management is organized across existing application modules.

The main locations include:

```text
frontend/
├── context/
│   ├── QueryProvider.tsx
│   ├── ToastContext.tsx
│   ├── WalletContext.tsx
│   └── WizardContext.tsx
│
└── features/
    └── verification/
        └── store/
```

Responsibilities:

- `context/`: Shared application state and React providers.
- `features/verification/store/`: Verification-specific state management.

The project also includes Zustand as a dependency.

Do not create a new top-level `stores/` directory unless a future architectural change explicitly requires it.

## 3. Supporting Directories

### `config/`

Contains application configuration modules.

Examples:

- `network.ts`: Expected Stellar network and network warning configuration.
- `plans.ts`: Subscription plan configuration.

### `hooks/`

Contains reusable React hooks shared across application features.

Examples include wallet transaction hooks, attestation polling, contract event polling, and verification status hooks.

### `utils/`

Contains reusable helper functions.

Examples:

- Cryptographic utilities.
- Hashing.
- Validation.
- Blob downloads.
- Wallet error handling.
- Soroban event parsing.

### `public/`

Contains static assets served directly by Next.js.

### `figma/`

Contains frontend design-related project resources.

## 4. Configuration and Testing Files

| File | Purpose |
|---|---|
| `.env.example` | Environment variable template |
| `package.json` | Frontend dependencies and scripts |
| `next.config.ts` | Next.js configuration |
| `tsconfig.json` | TypeScript configuration |
| `eslint.config.mjs` | ESLint configuration |
| `jest.config.ts` | Jest configuration |
| `setupTests.ts` | Test environment setup |
| `postcss.config.mjs` | PostCSS configuration |
| `tailwind.config.ts` | Tailwind configuration |

## 5. Recommended Development Organization

When adding new frontend functionality:

1. Add routes and route-specific page components under `app/`.
2. Put reusable interface elements under `components/`.
3. Keep feature-specific functionality inside `features/`.
4. Put API and blockchain integrations in `services/`.
5. Use `context/` for shared application providers.
6. Use `hooks/` for reusable React hooks.
7. Keep helper functions inside `utils/`.
8. Keep feature-specific state inside the relevant feature's store.
9. Add tests close to the relevant feature or module.

## 6. Related Documentation

- [Getting Started](./GETTING_STARTED.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [Next.js App Router Structure](./APP_ROUTER.md)
