
# Frontend Dependency Inventory

## Overview

StellarProof uses a modern React and Next.js frontend architecture with supporting libraries for blockchain integration, state management, data fetching, UI interactions, validation, and testing.

This document provides an inventory of the principal frontend dependencies and explains their responsibilities.

Dependency versions are based on the current `frontend/package.json` and should be checked against that file whenever dependencies are upgraded.

## 1. Core Framework and UI Dependencies

| Dependency | Declared version | Purpose |
| --- | --- | --- |
| `next` | `16.1.6` | React framework, App Router, routing, rendering, and application build |
| `react` | `19.2.3` | Component-based UI development |
| `react-dom` | `19.2.3` | React rendering in the browser |
| `typescript` | `^5` | Static typing and developer tooling |
| `tailwindcss` | `^4` | Utility-first styling |
| `@tailwindcss/postcss` | `^4` | Tailwind CSS integration with PostCSS |

### Next.js

Next.js provides the primary frontend application framework.

Responsibilities include:

- App Router-based navigation.
- Server and client component architecture.
- Route and page organization.
- Application rendering.
- Production build optimization.
- Integration with the React ecosystem.

The application routes are maintained in:

`frontend/app/`

### React and React DOM

React provides the component model used throughout the frontend.

React DOM handles browser rendering.

The project uses React hooks, reusable components, context providers, and client-side interactions.

## 2. Blockchain and Wallet Dependencies

| Dependency | Declared version | Purpose |
| --- | --- | --- |
| `@stellar/stellar-sdk` | `^15.1.0` | Stellar blockchain SDK integration |
| `@stellar/freighter-api` | `^6.0.1` | Freighter wallet connectivity |

### Stellar SDK

The Stellar SDK is the project's principal Stellar ecosystem dependency.

It provides the underlying JavaScript and TypeScript tooling for working with Stellar network functionality.

Its responsibilities include supporting Stellar transaction and blockchain integration workflows.

### Freighter API

The Freighter API provides browser wallet integration.

The frontend uses it to support operations such as:

- Checking wallet availability.
- Requesting wallet access.
- Retrieving the connected account address.
- Reading network information.

Relevant implementation:

`frontend/services/wallet.ts`

## 3. State Management and Data Fetching

| Dependency | Declared version | Purpose |
| --- | --- | --- |
| `zustand` | `^5.0.11` | Application state management |
| `@tanstack/react-query` | `^5.100.6` | Asynchronous server-state management |

### Zustand

Zustand provides lightweight application state management.

It is used for managing verification workflow state, including:

- Current workflow step.
- Form data.
- Verification progress.
- Submission status.
- Validation state.
- Persisted workflow data.

Relevant implementation:

`frontend/features/verification/store/wizard.store.ts`

### TanStack React Query

TanStack React Query manages asynchronous server state.

It provides functionality for:

- Fetching remote data.
- Managing loading and error states.
- Caching server responses.
- Refetching data.
- Managing asynchronous mutations.

The application configures its QueryClient through:

`frontend/context/QueryProvider.tsx`

The current configuration sets a query stale time of 60 seconds and disables automatic refetching on window focus.

## 4. UI and Interaction Dependencies

| Dependency | Declared version | Purpose |
| --- | --- | --- |
| `framer-motion` | `^11.15.0` | UI animation and transitions |
| `lucide-react` | `^0.468.0` | Icon components |
| `@heroicons/react` | `^2.2.0` | Heroicons icon library |
| `@radix-ui/react-tooltip` | `^1.2.16` | Accessible tooltip primitives |
| `@dnd-kit/core` | `^6.3.1` | Drag-and-drop interactions |
| `@dnd-kit/sortable` | `^9.0.0` | Sortable drag-and-drop functionality |
| `@dnd-kit/utilities` | `^3.2.2` | Supporting drag-and-drop utilities |
| `clsx` | `^2.1.1` | Conditional CSS class composition |
| `react-hot-toast` | `^2.6.0` | Toast notifications |
| `react-dropzone` | `^15.0.0` | File drop and selection interactions |

These dependencies support the frontend's interactive interface, reusable components, visual feedback, and user experience.

## 5. Forms and Validation

| Dependency | Declared version | Purpose |
| --- | --- | --- |
| `react-hook-form` | `^7.71.2` | Form state and submission management |
| `@hookform/resolvers` | `^5.2.2` | Schema validation integration |
| `zod` | `^4.3.6` | Schema definition and validation |

These libraries support structured form handling and validation.

Zod can also be used to validate data at application boundaries where runtime validation is required.

## 6. Data Visualization and Document Rendering

| Dependency | Declared version | Purpose |
| --- | --- | --- |
| `recharts` | `^3.10.1` | Data visualization and charts |
| `@react-pdf/renderer` | `^4.3.2` | PDF document generation |
| `qrcode.react` | `^4.2.0` | QR code rendering |
| `react-json-view` | `^1.21.3` | Interactive JSON visualization |
| `prismjs` | `^1.30.0` | Syntax highlighting |
| `swagger-ui-react` | `5.34.0` | API documentation interface |

These libraries provide supporting functionality for dashboards, certificates, structured data, and developer-facing interfaces.

## 7. XML and Data Utilities

| Dependency | Declared version | Purpose |
| --- | --- | --- |
| `fast-xml-parser` | `^5.4.1` | XML parsing and serialization |

Use the appropriate utility library rather than introducing custom parsing logic when an existing dependency already supports the required operation.

## 8. Development and Testing Dependencies

The following packages are declared under `devDependencies`.

| Dependency | Declared version | Purpose |
| --- | --- | --- |
| `eslint` | `^9` | JavaScript and TypeScript linting |
| `eslint-config-next` | `16.1.6` | Next.js ESLint configuration |
| `jest` | `^30.2.0` | Test execution |
| `jest-environment-jsdom` | `^30.3.0` | Browser-like test environment |
| `ts-jest` | `^29.4.6` | TypeScript integration for Jest |
| `ts-node` | `^10.9.2` | TypeScript execution in Node.js |
| `@testing-library/react` | `^16.3.2` | React component testing |
| `@testing-library/dom` | `^10.4.1` | DOM testing utilities |
| `@testing-library/jest-dom` | `^6.9.1` | DOM-specific Jest matchers |
| `@testing-library/user-event` | `^14.6.1` | User interaction simulation |
| `@types/jest` | `^30.0.0` | Jest TypeScript definitions |
| `@types/node` | `^20` | Node.js TypeScript definitions |
| `@types/react` | `^19` | React TypeScript definitions |
| `@types/react-dom` | `^19` | React DOM TypeScript definitions |
| `@types/prismjs` | `^1.26.6` | Prism.js TypeScript definitions |
| `@types/swagger-ui-react` | `5.18.0` | Swagger UI TypeScript definitions |

## 9. Dependency Management

The StellarProof repository uses pnpm.

The root `package.json` specifies:

`pnpm@10.18.2`

The frontend package is named:

`web`

Install project dependencies from the repository root:

```bash
pnpm install
```

Install dependencies using the existing lockfile:

```bash
pnpm install --frozen-lockfile
```

Run frontend linting:

```bash
pnpm --filter web run lint
```

Run the frontend production build:

```bash
pnpm --filter web run build
```

Run frontend tests:

```bash
pnpm --filter web run test
```

## 10. Dependency Management Guidelines

Contributors should follow these practices:

- Reuse existing dependencies before introducing additional packages.
- Avoid installing duplicate libraries that provide the same functionality.
- Use compatible versions of React, Next.js, and their supporting libraries.
- Avoid unnecessary major dependency upgrades in unrelated pull requests.
- Keep dependency changes synchronized with the lockfile.
- Do not introduce unused dependencies.
- Prefer maintained packages with suitable security and maintenance records.
- Keep development-only dependencies in `devDependencies`.
- Review package compatibility before changing framework or build tooling.

## 11. CI Compatibility

The repository CI workflow is defined in:

`.github/workflows/ci.yml`

The workflow includes:

- Node.js 20 setup.
- pnpm 10.18.2 installation.
- Frozen-lockfile dependency installation.
- Frontend ESLint validation.
- Frontend production build.

Documentation-only changes should not require dependency updates or changes to this workflow.

## Related Configuration Files

- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/context/QueryProvider.tsx`
- `frontend/context/WalletContext.tsx`
- `frontend/features/verification/store/wizard.store.ts`
- `frontend/services/wallet.ts`
- `.github/workflows/ci.yml`
