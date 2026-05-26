# StellarProof Development Guidelines

## Coding Standards
- **TypeScript**: Use strict typing. Avoid `any`. Define interfaces and types in dedicated `types/` files or adjacent to the implementation.
- **Formatting**: Use ESLint and Prettier. The monorepo uses `lint-staged` and Husky for pre-commit hooks.
- **Naming**: 
  - Variables/Functions: `camelCase`
  - Classes/React Components: `PascalCase`
  - Files (Backend): `[feature].[type].ts` (e.g., `auth.controller.ts`)
  - Files (Frontend): `Component.tsx` or `page.tsx` / `layout.tsx` for App Router.

## Architecture Rules
1. **Backend Layering**: 
   - **Controllers** must only handle HTTP concerns (extracting req, sending res).
   - **Services** must contain all business logic.
   - **Models** must define the schema and database hooks (e.g., deterministic hashing).
2. **Frontend Composition**: 
   - Favor small, reusable components in `components/ui/`.
   - Feature-specific logic belongs in `features/[feature-name]/`.
3. **Smart Contracts**: 
   - Keep on-chain storage minimal. Store only hashes, IDs, and critical state.
   - Use cross-contract calls for modularity (e.g., Oracle calling Provenance).

## AI Agent Specific Rules
- **Swagger Documentation**: When implementing backend integration, **always strictly adhere to the provided Swagger documentation** for exact endpoint URLs and payload property names, rather than assuming standard naming conventions.
- **Bad Request Handling**: Whenever you receive a 'Bad Request' (400) error, verify the exact request body payload using Swagger documentation rather than blindly guessing.
- **Next.js Suspense**: Whenever you use `useSearchParams()` in a Next.js file, **immediately wrap the logic in a `<Suspense>` boundary** to ensure it does not break the production build.
- **Scaffolding for Contributors**: When setting up tasks for human contributors, ensure backend code scaffolding is provided without completing the actual complex business logic (leave specific logic like pre-save hooks or complex queries for contributors).

## Commit Conventions
- Use standard conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Include the scope if applicable: `feat(kms): add key rotation`.

## Testing Expectations
- **Backend**: Unit tests for services and controllers using Jest. Use `mongodb-memory-server` or similar for database mocking, or ensure tests handle DB connections cleanly.
- **Frontend**: Component testing using React Testing Library and Jest.
- **Smart Contracts**: Rust unit tests (`cargo test`) alongside the implementation in `src/test.rs`.

## Reusable Component Strategy
- Frontend components should be dumb/presentational where possible.
- Complex state should be hoisted to Zustand stores (e.g., `useWizardStore`) or React Context.
- Tailwind CSS is used for styling; use the `cn()` utility function (clsx + tailwind-merge) for conditional classes.

## Backend Service Patterns
- **Transactions**: Any multi-document database operation (like KMS key rotation) must use MongoDB sessions and transactions to guarantee atomicity.
- **Deterministic Hashing**: Use the utility in `utils/crypto.ts` for generating hashes, typically invoked via Mongoose pre-save hooks.

## API Standards
- **Versioning**: All API routes must be prefixed with `/api/v1/`.
- **Response Format**:
  - Success: `{ "success": true, "data": { ... }, "message": "..." }`
  - Error: `{ "success": false, "error": "Error description" }`

## Error Handling Conventions
- **Backend**: Throw custom `AppError` instances with HTTP status codes and specific error codes (e.g., `INVALID_PAGINATION`). The `globalErrorHandler` middleware will catch and format these.
- **Frontend**: Catch errors in services or hooks and use the `ToastContext` to display user-friendly error messages. Map known blockchain/wallet errors using the utilities in `utils/walletErrors.ts`.
