
# Frontend Linting and Formatting

This document explains the linting configuration and code-quality workflow used by the StellarProof frontend.

The frontend uses ESLint with the Next.js Core Web Vitals and Next.js TypeScript configurations.

## 1. Configuration Files

| File | Purpose |
|---|---|
| `frontend/eslint.config.mjs` | ESLint flat configuration |
| `frontend/package.json` | Frontend lint script and development dependencies |
| `package.json` | Root package scripts and lint-staged configuration |
| `.github/workflows/ci.yml` | Frontend linting in GitHub Actions |
| `.husky/pre-commit` | Pre-commit hook |
| `.husky/pre-push` | Pre-push hook |

## 2. ESLint Configuration

**File:** `frontend/eslint.config.mjs`

The current configuration is:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

### Configuration details

**Next.js Core Web Vitals**

The `eslint-config-next/core-web-vitals` configuration enables Next.js-oriented linting, including rules intended to identify issues that can affect application performance and user experience.

**Next.js TypeScript**

The `eslint-config-next/typescript` configuration provides TypeScript-aware linting rules for the frontend.

**Ignored paths**

The configuration explicitly ignores:

- `.next/**`
- `out/**`
- `build/**`
- `next-env.d.ts`

These are generated or framework-managed files and should not be treated as ordinary application source files by this configuration.

## 3. Running ESLint

Run commands from the repository root unless otherwise specified.

### Lint the frontend

```bash
pnpm --filter web run lint
```

This runs the `lint` script from `frontend/package.json`:

```json
{
  "lint": "eslint"
}
```

ESLint checks the frontend project using `frontend/eslint.config.mjs`.

### Run ESLint directly

```bash
pnpm --filter web exec eslint .
```

### Check a specific file

```bash
pnpm --filter web exec eslint components/ui/Button.tsx
```

### Automatically fix supported issues

```bash
pnpm --filter web exec eslint . --fix
```

Review the resulting changes before committing them. Automatic fixes do not resolve every lint issue and should not replace code review.

## 4. Formatting

### Current formatting setup

The inspected frontend package does not declare Prettier as a dependency, and the repository does not contain a frontend Prettier configuration file.

There is also no frontend `format` or `format:check` script in the current package configuration.

Therefore:

- ESLint is the configured frontend linting tool.
- Do not assume that Prettier is installed.
- Do not add a Prettier command to the project workflow unless the project maintainers explicitly introduce and configure it.
- Keep formatting consistent with the surrounding source code.
- Avoid unrelated formatting changes when working on a focused issue.

### Formatting expectations

When writing or updating frontend code:

1. Use consistent indentation.
2. Use the existing quote and semicolon conventions of the file being edited.
3. Keep imports organized and remove unused imports.
4. Use clear component, function, and variable names.
5. Avoid unnecessarily long or deeply nested expressions.
6. Keep JSX readable.
7. Use the existing TypeScript types and interfaces.
8. Avoid unrelated changes to generated files.

These are contribution conventions, not additional ESLint rules.

## 5. TypeScript and Linting

ESLint and TypeScript checking serve different purposes.

- ESLint identifies configured code-quality and framework-rule violations.
- TypeScript checks type compatibility and static type correctness.

Run the TypeScript compiler without emitting output:

```bash
pnpm --filter web exec tsc --noEmit
```

The frontend's strict TypeScript settings are defined in:

```text
frontend/tsconfig.json
```

The production Next.js build also performs framework build checks, including TypeScript checks where applicable.

## 6. Pre-commit Workflow

The root `package.json` configures `lint-staged` for frontend TypeScript files:

```json
{
  "lint-staged": {
    "frontend/**/*.{ts,tsx}": [
      "pnpm --filter web exec eslint --fix --cache --cache-location .eslintcache"
    ]
  }
}
```

This means matching staged `.ts` and `.tsx` files can be passed through ESLint's automatic fixes when the configured lint-staged workflow is invoked.

The repository also contains:

```text
.husky/pre-commit
.husky/pre-push
```

Check the current hook scripts before relying on a particular hook behavior. The presence of a hook file does not by itself mean every quality check is automatically executed by that hook.

## 7. Continuous Integration

The GitHub Actions workflow is:

```text
.github/workflows/ci.yml
```

The frontend-related CI steps include:

```yaml
- name: Lint Frontend
  run: pnpm --filter web run lint

- name: Build Frontend
  run: pnpm --filter web run build
```

The workflow installs dependencies using the lockfile:

```bash
pnpm install --frozen-lockfile
```

Do not modify the package manifest or lockfile for documentation-only changes.

## 8. Recommended Local Quality Checks

Before submitting frontend changes, run:

```bash
pnpm install --frozen-lockfile

pnpm --filter web run lint

pnpm --filter web exec tsc --noEmit

pnpm --filter web run test

pnpm --filter web run build
```

These commands check dependency installation, linting, TypeScript, Jest tests, and the production build.

## 9. Troubleshooting

### ESLint reports an error

1. Read the rule name and affected file.
2. Inspect the surrounding code.
3. Fix the underlying issue.
4. Run ESLint again.
5. Review any automatic changes before committing.

### TypeScript reports an error

1. Check the affected type or interface.
2. Confirm that component props match the expected type.
3. Check imports and exported symbols.
4. Avoid using `any` as a quick workaround.
5. Re-run the TypeScript check.

### The frontend build fails

1. Check the first meaningful build error.
2. Confirm dependencies were installed from the existing lockfile.
3. Check for TypeScript and import-resolution errors.
4. Run the frontend lint and TypeScript checks.
5. Re-run the production build.

### Prettier commands are unavailable

This is expected with the current configuration because Prettier is not declared as a frontend dependency and no Prettier configuration was found.

Do not treat the absence of Prettier as a lint failure.

## 10. Contribution Checklist

Before submitting a frontend pull request:

- [ ] Frontend ESLint completes successfully.
- [ ] TypeScript completes without errors.
- [ ] Relevant Jest tests pass.
- [ ] Frontend production build completes successfully.
- [ ] No unrelated formatting changes are included.
- [ ] No generated build output is committed.
- [ ] The existing pnpm lockfile is preserved unless dependency changes are intentional.
