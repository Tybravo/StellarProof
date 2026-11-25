
# Frontend Getting Started Guide

This guide explains how to install, configure, run, test, and build the StellarProof frontend locally.

## 1. Overview

The StellarProof frontend is a Next.js application that provides the user interface for digital content verification, certificate management, Stellar wallet interactions, governance, and other platform features.

### Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | Application framework and routing |
| React 19 | User interface |
| TypeScript | Static typing |
| Tailwind CSS 4 | Styling |
| Zustand | Client-side state management |
| React Context | Shared application state and providers |
| TanStack Query | Server-state management |
| Stellar SDK | Stellar blockchain integration |
| Freighter API | Stellar wallet connectivity |
| Jest | Unit and component testing |
| ESLint | Code quality and linting |

## 2. Prerequisites

Before setting up the frontend, install the following:

- Node.js 20.9 or later.
- pnpm 10.18.2.
- Git.
- A code editor such as Visual Studio Code.

The repository uses pnpm workspaces. Run installation commands from the repository root unless otherwise specified.

Verify your installations:

```bash
node --version
pnpm --version
git --version
```

## 3. Clone the Repository

```bash
git clone https://github.com/Tybravo/StellarProof.git
cd StellarProof
```

## 4. Install Dependencies

Install the workspace dependencies from the repository root:

```bash
pnpm install
```

This installs dependencies for the configured workspace packages, including the frontend.

## 5. Configure Environment Variables

Navigate to the frontend directory:

```bash
cd frontend
```

Create your local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, you can use:

```powershell
Copy-Item .env.example .env.local
```

Open `frontend/.env.local` and configure the required values for your local environment.

Important:

- Use Stellar Testnet for local blockchain development unless you intentionally need another network.
- Configure the appropriate Soroban contract IDs when testing contract-dependent functionality.
- Set `NEXT_PUBLIC_API_URL` to the URL of your running backend.
- Never put private keys, API secrets, or other confidential credentials in `NEXT_PUBLIC_` variables.

See [Environment Variables](./ENVIRONMENT_VARIABLES.md) for the complete configuration reference.

## 6. Start the Development Server

Return to the repository root:

```bash
cd ..
```

Start the frontend:

```bash
pnpm --filter web dev
```

The application will normally be available at:

http://localhost:3000

Next.js automatically reloads the application when you modify supported source files.

## 7. Available Frontend Scripts

The following scripts are defined in `frontend/package.json`.

| Command | Description |
|---|---|
| `pnpm --filter web dev` | Starts the development server |
| `pnpm --filter web build` | Creates a production build |
| `pnpm --filter web start` | Starts the production server |
| `pnpm --filter web lint` | Runs ESLint |
| `pnpm --filter web test` | Runs Jest tests |
| `pnpm --filter web test:watch` | Runs Jest in watch mode |

### Root-Level Frontend Commands

The repository also provides these convenience scripts:

```bash
# Lint the frontend
pnpm check:frontend

# Build the frontend
pnpm build:frontend
```

### TypeScript Validation

Run the TypeScript compiler without generating output:

```bash
pnpm --filter web exec tsc --noEmit
```

## 8. Running Tests

Run the frontend test suite:

```bash
pnpm --filter web test
```

Run tests in watch mode:

```bash
pnpm --filter web test:watch
```

The frontend uses Jest, React Testing Library, and jsdom for component and application testing.

## 9. Production Build

To verify that the frontend can be built for production:

```bash
pnpm --filter web build
```

After a successful build, start the production server:

```bash
pnpm --filter web start
```

The production application normally runs at:

http://localhost:3000

## 10. Frontend Architecture

The frontend follows the Next.js App Router architecture.

Important directories:

- `app/`: Routes, layouts, and API route handlers.
- `components/`: Shared and reusable UI components.
- `features/`: Feature-specific application modules.
- `services/`: API and blockchain service integrations.
- `context/`: Application-wide React context providers.
- `hooks/`: Reusable React hooks.
- `config/`: Application configuration.
- `utils/`: Shared utility functions.

For a detailed explanation, see:

- [Project Directory Structure](./DIRECTORY_STRUCTURE.md)
- [Next.js App Router Structure](./APP_ROUTER.md)

## 11. Development Guidelines

When contributing to the frontend:

1. Follow the existing folder structure and coding conventions.
2. Use TypeScript for new application code.
3. Reuse existing components, hooks, contexts, and services where appropriate.
4. Keep feature-specific logic within its relevant feature module.
5. Avoid introducing unnecessary dependencies.
6. Add or update tests when changing application behavior.
7. Run ESLint and TypeScript validation before submitting changes.
8. Verify that the production build succeeds.

Documentation-only changes should not require application code or configuration changes.

## 12. Troubleshooting

### Dependencies are not installed

Run the installation command from the repository root:

```bash
pnpm install
```

### Environment variables are not being applied

- Confirm that `frontend/.env.local` exists.
- Verify the variable names and values.
- Restart the development server after changing environment variables.

### Backend API requests fail

Verify that:

- The backend is running.
- `NEXT_PUBLIC_API_URL` points to the correct backend URL.
- The backend allows requests from the frontend origin.

### Stellar wallet connection fails

Verify that:

- Freighter is installed in your browser.
- The wallet is unlocked.
- The selected network matches the application's expected network.
- Required contract configuration is available.

### Production build fails

Run:

```bash
pnpm check:frontend
pnpm --filter web exec tsc --noEmit
pnpm build:frontend
```

Review the reported errors before submitting a pull request.

## 13. Additional Resources

- [StellarProof Repository](https://github.com/Tybravo/StellarProof)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [pnpm Documentation](https://pnpm.io/)
- [Stellar Developer Documentation](https://developers.stellar.org/)
- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts/overview)
- [Freighter Wallet](https://www.freighter.app/)
