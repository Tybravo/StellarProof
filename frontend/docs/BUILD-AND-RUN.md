
# Frontend Build and Run Guide

This document explains how to install dependencies, run the StellarProof frontend locally, execute tests, lint the code, and create a production build.

All frontend commands in this guide use the existing scripts in `frontend/package.json`.

## 1. Prerequisites

Before running the frontend, ensure the following tools are installed:

| Tool | Requirement |
|---|---|
| Node.js | Node.js 20 is used by the current GitHub Actions workflow |
| pnpm | Version `10.18.2`, as declared by the root package |
| Git | Required to clone and manage the repository |

The frontend uses the repository's pnpm workspace and root lockfile.

## 2. Install the Repository

Clone the repository and enter its root directory:

```bash
git clone https://github.com/Tybravo/StellarProof.git

cd StellarProof
```

Install workspace dependencies:

```bash
pnpm install
```

For a reproducible installation that does not update the lockfile:

```bash
pnpm install --frozen-lockfile
```

The frozen installation is also used by the existing CI workflow.

## 3. Frontend Development Server

Run the frontend development server:

```bash
pnpm --filter web run dev
```

This executes the frontend package script:

```json
{
  "dev": "next dev"
}
```

The Next.js development server normally starts at:

```text
http://localhost:3000
```

Open the displayed local URL in your browser.

The development server provides Next.js development features, including recompilation as application files are changed.

To stop the server, use:

```text
Ctrl + C
```

## 4. Production Build

Build the frontend:

```bash
pnpm --filter web run build
```

This executes:

```json
{
  "build": "next build"
}
```

Next.js generates the production build output in the frontend's `.next/` directory.

A successful build indicates that Next.js completed its production compilation and associated build checks.

The exact build output depends on the current application routes, dependencies, and build environment.

## 5. Run the Production Server

First create a production build:

```bash
pnpm --filter web run build
```

Then start the production server:

```bash
pnpm --filter web run start
```

This executes:

```json
{
  "start": "next start"
}
```

The production server serves the generated Next.js build, normally at:

```text
http://localhost:3000
```

The production start command should not be used as a replacement for the development command.

## 6. Lint the Frontend

Run:

```bash
pnpm --filter web run lint
```

This executes ESLint using the frontend configuration.

The command checks the frontend source against the configured Next.js Core Web Vitals and TypeScript rules.

A successful run completes without ESLint errors.

To inspect the linting configuration, see:

```text
frontend/eslint.config.mjs
```

For additional details, see:

```text
frontend/docs/LINTING-AND-FORMATTING.md
```

## 7. Run Frontend Tests

The frontend uses Jest and React Testing Library.

Run the full frontend test suite:

```bash
pnpm --filter web run test
```

This executes:

```json
{
  "test": "jest"
}
```

### Run tests in watch mode

```bash
pnpm --filter web run test:watch
```

This executes:

```json
{
  "test:watch": "jest --watch"
}
```

Watch mode is useful during development because Jest can rerun relevant tests as files change.

### Run tests serially

```bash
pnpm --filter web run test --runInBand
```

Running tests serially can be useful when diagnosing resource contention or test isolation problems.

### Test configuration

The frontend Jest configuration is:

```text
frontend/jest.config.ts
```

It specifies:

- `jsdom` as the test environment.
- `frontend/setupTests.ts` as the setup file.
- The `@/` import alias.
- Jest test discovery under the frontend project.
- `ts-jest` for TypeScript and TSX transformation.

Tests are commonly located in:

```text
frontend/components/**/__tests__/
frontend/services/__tests__/
frontend/utils/__tests__/
```

The frontend also contains component-level test files such as:

```text
frontend/components/ui/Accordion.test.tsx
```

### Expected test output

Jest reports:

- The test suites it executed.
- Individual test results.
- Passed and failed test counts.
- Execution time.

A successful run ends with all executed test suites and tests passing.

The exact number of tests may change as the project evolves.

## 8. TypeScript Check

The frontend package does not currently define a separate `typecheck` script.

You can run the TypeScript compiler directly:

```bash
pnpm --filter web exec tsc --noEmit
```

This checks the frontend TypeScript project without generating JavaScript output.

The frontend TypeScript configuration is:

```text
frontend/tsconfig.json
```

The production Next.js build also performs its applicable framework and TypeScript build checks.

## 9. Available Frontend Scripts

The current `frontend/package.json` declares:

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Starts the development server |
| `build` | `next build` | Creates the production build |
| `start` | `next start` | Starts the production server |
| `lint` | `eslint` | Runs frontend linting |
| `test` | `jest` | Runs frontend tests |
| `test:watch` | `jest --watch` | Runs tests in watch mode |

These are the scripts currently available in the frontend package. Do not assume that scripts such as `format`, `format:check`, or `typecheck` are configured.

## 10. Root-Level Frontend Commands

The root `package.json` also provides shortcuts for frontend checks:

```bash
pnpm run check:frontend
```

This runs the frontend lint script.

```bash
pnpm run build:frontend
```

This runs the frontend production build.

The equivalent package-filter commands are:

```bash
pnpm --filter web run lint

pnpm --filter web run build
```

## 11. Continuous Integration Workflow

The current workflow is:

```text
.github/workflows/ci.yml
```

It runs on pushes and pull requests targeting `main`.

The workflow performs these relevant operations:

1. Checks out the repository.
2. Installs Node.js 20.
3. Installs pnpm `10.18.2`.
4. Installs dependencies with `pnpm install --frozen-lockfile`.
5. Builds the backend.
6. Runs frontend ESLint.
7. Builds the frontend.
8. Installs Rust and the `wasm32-unknown-unknown` target.
9. Builds the Oracle, Provenance, and Registry contracts.

The frontend CI commands are:

```bash
pnpm --filter web run lint

pnpm --filter web run build
```

The current workflow does not include a frontend Jest test step. Running frontend tests locally is still recommended when making changes that affect frontend behavior.

## 12. Recommended Pre-PR Checks

Before submitting frontend code changes, run:

```bash
pnpm install --frozen-lockfile

pnpm --filter web run lint

pnpm --filter web exec tsc --noEmit

pnpm --filter web run test

pnpm --filter web run build
```

These checks help identify dependency, lint, TypeScript, test, and production-build problems before a pull request is submitted.

## 13. Troubleshooting

### Port 3000 is already in use

Stop the process using the port or use the alternative port option supported by Next.js:

```bash
pnpm --filter web run dev -- --port 3001
```

Then open:

```text
http://localhost:3001
```

### Dependencies are inconsistent

Reinstall using the repository lockfile:

```bash
pnpm install --frozen-lockfile
```

Do not delete or regenerate the lockfile as a first troubleshooting step.

### Build fails

Run the checks separately:

```bash
pnpm --filter web run lint

pnpm --filter web exec tsc --noEmit

pnpm --filter web run build
```

Review the first relevant error and fix its underlying cause.

### Tests fail

Run the test suite:

```bash
pnpm --filter web run test
```

For easier diagnosis, run serially:

```bash
pnpm --filter web run test --runInBand
```

Check the failing test, its mocks, setup files, and the component or service under test.

## 14. Development Checklist

- [ ] Dependencies installed with pnpm.
- [ ] Frontend development server starts.
- [ ] ESLint completes successfully.
- [ ] TypeScript check completes successfully.
- [ ] Relevant Jest tests pass.
- [ ] Production frontend build completes successfully.
- [ ] No unintended changes to `pnpm-lock.yaml`.
- [ ] No generated `.next/` output committed.
- [ ] Existing CI workflow remains unchanged unless a separate change is required.
