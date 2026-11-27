
# Next.js App Router Structure

This document describes the routing architecture of the StellarProof frontend, including its route hierarchy, page organization, API handlers, and shared layouts.

The application uses the Next.js App Router.

## 1. App Router Location

All application routes are defined under:

```text
frontend/app/
```

Next.js uses the filesystem to determine the URL structure.

For example:

```text
app/
├── page.tsx
├── layout.tsx
├── verify/
│   └── page.tsx
└── wallet/
    └── page.tsx
```

This produces:

| File | URL |
|---|---|
| `app/page.tsx` | `/` |
| `app/verify/page.tsx` | `/verify` |
| `app/wallet/page.tsx` | `/wallet` |

## 2. Application Layout Hierarchy

The application uses a root layout and a nested dashboard layout.

### 2.1 Root Layout

Location:

```text
frontend/app/layout.tsx
```

The root layout wraps the entire application.

It provides:

- HTML document structure.
- Global styles.
- Application metadata.
- Font configuration.
- Theme provider.
- Authentication provider.
- Wallet provider.
- Toast provider.
- Wizard provider.
- React Query provider.
- Modal provider.
- Shared footer.
- Scroll-to-top functionality.
- Development debug panel.

The current provider hierarchy is:

```text
RootLayout
└── html
    └── body
        └── ThemeProvider
            └── ToastProvider
                └── WalletProvider
                    └── WizardProvider
                        └── QueryProvider
                            └── AuthProvider
                                └── ModalProvider
                                    ├── Current Page
                                    ├── Footer
                                    ├── ScrollToTop
                                    └── DebugPanel
```

All application routes inherit the root layout.

### 2.2 Dashboard Layout

Location:

```text
frontend/app/dashboard/layout.tsx
```

The dashboard has its own nested layout.

Hierarchy:

```text
RootLayout
└── DashboardLayout
    └── Dashboard Page
```

The dashboard layout is shared by dashboard routes, including its assets, billing, developer documentation, and settings pages.

## 3. Frontend Route Map

The following routes reflect the existing `page.tsx` and route handler files in `frontend/app/`.

### 3.1 Main Application Routes

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Main landing page |
| `/builder` | `app/builder/page.tsx` | Builder interface |
| `/certificate/[id]` | `app/certificate/[id]/page.tsx` | Certificate details using a dynamic ID |
| `/checkout/fiat` | `app/checkout/fiat/page.tsx` | Fiat checkout |
| `/connect` | `app/connect/page.tsx` | Connection interface |
| `/contact` | `app/contact/page.tsx` | Contact page |
| `/creators` | `app/creators/page.tsx` | Creator directory |
| `/forget-password` | `app/forget-password/page.tsx` | Password recovery |
| `/launch` | `app/launch/page.tsx` | Launch page |
| `/login` | `app/login/page.tsx` | Login page |
| `/manifest` | `app/manifest/page.tsx` | Manifest interface |
| `/pricing` | `app/pricing/page.tsx` | Pricing page |
| `/product` | `app/product/page.tsx` | Product page |
| `/register` | `app/register/page.tsx` | Registration page |
| `/registry` | `app/registry/page.tsx` | Registry interface |
| `/registry/staking` | `app/registry/staking/page.tsx` | Registry staking |
| `/report-issue` | `app/report-issue/page.tsx` | Issue reporting |
| `/search` | `app/search/page.tsx` | Search interface |
| `/vault` | `app/vault/page.tsx` | Vault interface |
| `/verify` | `app/verify/page.tsx` | Verification interface |
| `/verify-new-password` | `app/verify-new-password/page.tsx` | New password verification |
| `/verify-password` | `app/verify-password/page.tsx` | Password verification |
| `/wallet` | `app/wallet/page.tsx` | Wallet interface |

### 3.2 Dashboard Routes

Dashboard pages share the nested dashboard layout.

| Route | File | Description |
|---|---|---|
| `/dashboard` | `app/dashboard/page.tsx` | Main dashboard |
| `/dashboard/assets` | `app/dashboard/assets/page.tsx` | Asset management |
| `/dashboard/billing` | `app/dashboard/billing/page.tsx` | Billing management |
| `/dashboard/developer/docs` | `app/dashboard/developer/docs/page.tsx` | Developer documentation |
| `/dashboard/request-row-test` | `app/dashboard/request-row-test/page.tsx` | Request row test interface |
| `/dashboard/settings/subscription` | `app/dashboard/settings/subscription/page.tsx` | Subscription settings |

### 3.3 Governance Routes

| Route | File | Description |
|---|---|---|
| `/governance` | `app/governance/page.tsx` | Governance proposals |
| `/governance/[proposalId]` | `app/governance/[proposalId]/page.tsx` | Individual proposal details |

### 3.4 Demonstration Routes

| Route | File | Description |
|---|---|---|
| `/skeleton-demo` | `app/skeleton-demo/page.tsx` | Skeleton UI demonstration |
| `/stepper-demo` | `app/stepper-demo/page.tsx` | Stepper UI demonstration |

These routes are part of the current repository structure and should not automatically be considered production user journeys.

## 4. API Route Handlers

The frontend also contains a Next.js route handler.

Location:

```text
frontend/app/api/health/route.ts
```

Endpoint:

```http
GET /api/health
```

This is an API route handler rather than a page route.

Route handlers use the Next.js App Router conventions and are implemented using `route.ts`.

## 5. Dynamic Routes

The application uses dynamic route segments for resources identified by unique IDs.

### Certificate Route

```text
app/
└── certificate/
    └── [id]/
        └── page.tsx
```

URL example:

```text
/certificate/123
```

The `[id]` segment represents a dynamic certificate identifier.

### Governance Proposal Route

```text
app/
└── governance/
    ├── page.tsx
    └── [proposalId]/
        └── page.tsx
```

URL example:

```text
/governance/proposal-123
```

The `[proposalId]` segment identifies an individual governance proposal.

## 6. Special App Router Files

| File | Purpose |
|---|---|
| `layout.tsx` | Defines a shared layout for a route segment and its children |
| `page.tsx` | Defines the UI for a route |
| `route.ts` | Defines an API endpoint |
| `not-found.tsx` | Defines a not-found interface |
| `globals.css` | Contains global styles |

The root application layout is responsible for global application composition, while nested layouts provide shared structures for specific route sections.

## 7. Adding a New Route

To create a new frontend route, create a directory under `frontend/app/` and add a `page.tsx` file.

For example, to add an `/activity` route:

```text
frontend/app/
└── activity/
    └── page.tsx
```

Example page:

```tsx
export default function ActivityPage() {
  return (
    <main>
      <h1>Activity</h1>
      <p>View your recent activity.</p>
    </main>
  );
}
```

The new route becomes accessible at:

```text
/activity
```

## 8. Adding a Nested Layout

To create a shared layout for a group of routes, add a `layout.tsx` file to the relevant route directory.

For example:

```text
frontend/app/
└── dashboard/
    ├── layout.tsx
    ├── page.tsx
    ├── assets/
    │   └── page.tsx
    └── billing/
        └── page.tsx
```

The dashboard layout wraps the dashboard page and its nested route pages.

## 9. Route Development Guidelines

When adding or modifying routes:

1. Follow the existing App Router directory conventions.
2. Use `page.tsx` for route interfaces.
3. Use `layout.tsx` for shared route layouts.
4. Use `route.ts` for API route handlers.
5. Use dynamic segments for resource identifiers where appropriate.
6. Keep reusable UI components inside `components/`.
7. Keep feature-specific business logic inside the relevant feature modules.
8. Reuse existing providers and application services.
9. Avoid duplicating the root layout's responsibilities in nested layouts.
10. Verify new routes through the frontend development server and production build.

## 10. Related Documentation

- [Getting Started](./GETTING_STARTED.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [Project Directory Structure](./DIRECTORY_STRUCTURE.md)

## 11. Official References

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js Dynamic Segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)
