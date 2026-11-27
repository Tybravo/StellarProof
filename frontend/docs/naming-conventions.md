
# Frontend Naming Conventions

This document establishes naming conventions for the StellarProof frontend.

It covers file names, React components, hooks, variables, functions, types, interfaces, folders, and reusable modules.

Consistent naming makes the codebase easier to understand, navigate, maintain, and extend.

## 1. General Naming Principles

All contributors should follow these principles:

- Use descriptive names.
- Prefer clarity over unnecessary abbreviations.
- Keep names consistent with the existing project structure.
- Use conventional React and TypeScript naming patterns.
- Avoid ambiguous names.
- Keep file names aligned with their primary exports.
- Use names that describe responsibility rather than implementation details where appropriate.

## 2. File Naming Conventions

### 2.1 React Components

Use PascalCase for React component files.

Examples:

```text
Header.tsx
Footer.tsx
ThemeToggle.tsx
ScrollToTop.tsx
```

A component file should normally export the component represented by its file name.

Example:

```tsx
export default function ThemeToggle() {
  return <button type="button">Toggle theme</button>;
}
```

### 2.2 Hooks

Use camelCase filenames beginning with `use`.

Examples:

```text
useTheme.ts
useWallet.ts
useScrollPosition.ts
```

Custom hooks should begin with the `use` prefix to follow React conventions.

### 2.3 Context and Provider Files

Use PascalCase for context and provider files.

Examples:

```text
ThemeContext.tsx
WalletContext.tsx
QueryProvider.tsx
```

Use names that identify the context or provider's responsibility.

### 2.4 Utility Files

Use camelCase for utility files.

Examples:

```text
formatDate.ts
formatAddress.ts
validateInput.ts
```

Use descriptive names that explain what the utility does.

### 2.5 Service Files

Use camelCase for service modules.

Examples:

```text
walletService.ts
verificationService.ts
proofService.ts
```

### 2.6 Type and Interface Files

Use descriptive PascalCase or domain-oriented names where appropriate.

Examples:

```text
WalletTypes.ts
VerificationTypes.ts
ApiResponse.ts
```

However, prefer colocating small types with the feature or module that owns them rather than creating unnecessary files.

## 3. React Component Naming

React components must use PascalCase.

Example:

```tsx
function VerificationCard() {
  return (
    <section>
      <h2>Verification Details</h2>
    </section>
  );
}

export default VerificationCard;
```

### Component Guidelines

- Use nouns or descriptive noun phrases.
- Make the component's purpose clear.
- Avoid generic names such as `Component1` or `Box`.
- Use consistent names for reusable UI elements.
- Prefer a single clear responsibility per component.
- Use descriptive names for page sections and shared components.

Examples:

```text
Header
Footer
HeroSection
VerificationCard
ThemeToggle
ScrollToTop
```

## 4. Custom Hook Naming

Custom React hooks must start with `use` and use camelCase.

Examples:

```tsx
function useTheme() {
  // Hook implementation
}

function useWallet() {
  // Hook implementation
}
```

### Hook Guidelines

- Start every custom hook name with `use`.
- Use descriptive names that communicate the state or behavior being managed.
- Keep hooks focused on reusable logic.
- Do not name ordinary utility functions as hooks unless they follow React hook rules.
- Follow React's rules of hooks.

Incorrect:

```tsx
function ThemeManager() {
  // Custom hook without the use prefix
}
```

Correct:

```tsx
function useThemeManager() {
  // Custom hook
}
```

## 5. Variables and Constants

### 5.1 Variables

Use camelCase for variables.

Examples:

```tsx
const walletAddress = "G...";
const isConnected = true;
const verificationStatus = "verified";
```

Boolean variables should use descriptive prefixes such as:

- `is`
- `has`
- `can`
- `should`

Examples:

```tsx
const isLoading = false;
const hasAccess = true;
const canVerify = true;
```

### 5.2 Constants

Use UPPER_SNAKE_CASE for module-level constants that represent fixed configuration values.

Examples:

```tsx
const MAX_FILE_SIZE = 10;
const DEFAULT_NETWORK = "testnet";
const REQUEST_TIMEOUT_MS = 5000;
```

Do not use uppercase naming for every variable. Reserve it for genuine constants.

## 6. Functions and Event Handlers

Use camelCase for functions.

Examples:

```tsx
function connectWallet() {
  // Implementation
}

function verifyContent() {
  // Implementation
}

function formatTransactionHash() {
  // Implementation
}
```

### Event Handler Naming

Use descriptive event handler names.

Common prefixes include:

- `handle`
- `on`

Examples:

```tsx
function handleSubmit() {
  // Submit form
}

function handleWalletConnect() {
  // Connect wallet
}
```

For component props, use `on` to describe callbacks.

Example:

```tsx
interface ButtonProps {
  onClick: () => void;
}
```

## 7. TypeScript Naming Conventions

Use PascalCase for:

- Types
- Interfaces
- Enums
- Classes

Examples:

```tsx
interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
}

type VerificationStatus =
  | "pending"
  | "verified"
  | "failed";

type Theme = "light" | "dark";
```

### TypeScript Guidelines

- Prefer explicit types for public component interfaces.
- Avoid unnecessary use of `any`.
- Use descriptive type names.
- Keep related types close to the modules that use them.
- Prefer union types for clearly defined sets of possible values.
- Use existing shared types rather than creating duplicates.

## 8. Folder Naming Conventions

Use lowercase, descriptive folder names.

Examples:

```text
app/
components/
context/
hooks/
services/
utils/
types/
docs/
```

Use feature-oriented folders when grouping related functionality.

Example:

```text
components/
  verification/
    VerificationCard.tsx
    VerificationStatus.tsx
  wallet/
    WalletConnect.tsx
    WalletStatus.tsx
```

The examples above describe a recommended organization pattern, not a requirement to restructure existing directories.

### Folder Guidelines

- Use lowercase folder names.
- Avoid spaces in folder names.
- Keep related files together.
- Avoid deeply nested structures without a clear reason.
- Do not create duplicate folders for the same responsibility.
- Follow the existing repository organization when extending an established feature.

## 9. Next.js App Router Naming

The Next.js App Router uses reserved file names for framework functionality.

Examples include:

```text
app/
  layout.tsx
  page.tsx
  globals.css
  loading.tsx
  error.tsx
  not-found.tsx
```

Follow Next.js conventions for route and special files.

Use `page.tsx` for route pages and `layout.tsx` for shared route layouts.

Do not rename framework-reserved files to follow general component naming rules.

## 10. Component Props Naming

Use PascalCase for interfaces describing component props.

A common convention is to suffix the interface with `Props`.

Example:

```tsx
interface VerificationCardProps {
  title: string;
  status: string;
  isLoading?: boolean;
}

export default function VerificationCard({
  title,
  status,
  isLoading = false,
}: VerificationCardProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{status}</p>
      {isLoading && <span>Loading...</span>}
    </div>
  );
}
```

Use camelCase for individual prop names.

## 11. Import and Export Conventions

Prefer clear and consistent import statements.

The project uses the `@/*` TypeScript path alias configured in `frontend/tsconfig.json`.

Example:

```tsx
import Header from "@/components/Header";
import { useWallet } from "@/context/WalletContext";
```

Use relative imports where they are appropriate, particularly for closely related files.

### Export Guidelines

- Use default exports where the existing component convention requires them.
- Use named exports for reusable hooks, providers, utilities, and types where appropriate.
- Avoid unnecessary re-exports.
- Keep import paths clear and maintainable.
- Follow the existing export style when extending an existing module.

## 12. Naming Examples

| Element | Convention | Example |
|---|---|---|
| React component | PascalCase | `VerificationCard` |
| Component file | PascalCase | `VerificationCard.tsx` |
| Custom hook | camelCase with `use` | `useWallet` |
| Hook file | camelCase with `use` | `useWallet.ts` |
| Variable | camelCase | `walletAddress` |
| Function | camelCase | `connectWallet` |
| Event handler | camelCase with `handle` | `handleSubmit` |
| Constant | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Interface | PascalCase | `WalletState` |
| Type | PascalCase | `VerificationStatus` |
| Enum | PascalCase | `NetworkType` |
| Folder | lowercase | `components` |
| Next.js route file | Framework-defined | `page.tsx` |

## 13. Common Naming Mistakes

Avoid:

```text
verificationcard.tsx
usewallet.ts
Wallet_Address
myfunction
component1
helpers2
```

Prefer:

```text
VerificationCard.tsx
useWallet.ts
walletAddress
formatWalletAddress
VerificationCard
formatDate
```

## 14. Naming Checklist

Before submitting a pull request, verify:

- [ ] Component files use PascalCase.
- [ ] React components use PascalCase.
- [ ] Custom hooks start with `use`.
- [ ] Variables and functions use camelCase.
- [ ] Fixed module-level constants use UPPER_SNAKE_CASE.
- [ ] Interfaces and types use PascalCase.
- [ ] Folders use descriptive lowercase names.
- [ ] Next.js reserved filenames remain unchanged.
- [ ] Imports follow existing project conventions.
- [ ] Names clearly describe their purpose.

## 15. Maintenance

Follow these conventions when creating new frontend files or extending existing functionality.

When an established project convention differs from a recommendation in this document, review the existing implementation before making structural changes.

Update this document when the frontend naming standards or project structure change.
