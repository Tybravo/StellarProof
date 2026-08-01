# Fix Report — Issue #377

**[Frontend] [Feature] Integrate Soroban/Backend Search API for Global Certificate Search**

Repo: `veloura-dev/StellarProof` (fork of `Tybravo/StellarProof`)
Affected path: `frontend/app/search/page.tsx`

---

## STEP 1–3 · Findings: what the codebase is, and what was actually broken

### What the developer is building

StellarProof is a **Web2.5 provenance system** for digital content, spanning three boundaries:

| Layer | Stack | Role |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind v4, Zustand, TanStack Query | Wizard UI, Freighter wallet, dashboards |
| Backend | Express + Mongoose | Indexes on-chain certificates into MongoDB for fast querying |
| Blockchain | Soroban (Rust) — `oracle`, `provenance`, `registry` | Immutable source of truth; mints certificates |

A TEE (AWS Nitro) verifies content off-chain, signs an attestation, and the Oracle contract authorizes the Provenance contract to mint a certificate. `Certificate.model.ts` explicitly describes itself as *"the off-chain cached representation of the On-Chain Provenance Certificate… allows fast querying for the frontend without hitting the Stellar RPC constantly."* That model is the intended data source for search.

### The actual defect

> **`frontend/app/search/` did not exist. At all.**

This was verified, not assumed:

```
$ find frontend -path "*search*" -type f     # → 0 results
$ ls frontend/app/                            # → 26 routes, no `search`
$ pnpm build                                  # → route table has no /search
```

The issue is phrased as *"connect the search UI to the backend"*, which implies a UI already existed. It did not — issues **#374 (ListView)**, **#375 (GridView)**, **#376 (view toggle)** and **#377 (this one, API integration)** were all filed together and none had landed. So #377 could not be delivered as a pure wiring change; the page, the views it feeds, and the data layer all had to be created for the integration to be demonstrable.

There was **no `axios` dependency** in `frontend/package.json`, so the requirement "using Axios/fetch" was satisfied with native `fetch` — no new dependency added.

---

## STEP 4 · The fix

Layered along the repo's existing conventions (service → hook → page → presentational components).

### 1. `frontend/services/searchService.ts` — API integration layer

- `searchCertificates()` calls **`GET {API_BASE}/api/v1/certificates/search`**, matching the mandated `/api/v1/` prefix and the `{ success, data }` envelope in `.context/DEVELOPMENT_GUIDELINES.md`.
- Base URL from `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_BACKEND_URL` (trailing slashes stripped).
- **Defensive normalization** — `normalizeCertificate()` accepts *both* real shapes:
  - the Mongo document (`certificateId`, `stellarNetwork`, populated `manifestId`/`assetId`), and
  - the flattened Soroban contract shape (`certificate_id`, `manifest_hash`, `timestamp` as ledger seconds).
  It never throws on sparse or malformed records.
- `normalizeSearchPayload()` tolerates `certificates` / `results` / `items`, and derives `page` from either `page` or `skip`+`limit`.
- Typed `SearchApiError` carrying `status`, `code`, `isAbort`, `isTimeout`. 12s timeout via `AbortController`.
- **Graceful degradation:** with no API URL configured it serves a deterministic 13-record fixture (`source: "mock"`) so the page works in local dev. When an API *is* configured and fails, it **rejects loudly** rather than masking a broken backend.

### 2. `frontend/hooks/useCertificateSearch.ts` — React Hooks layer

- 350 ms **debounce** (one request per pause, not per keystroke).
- **Race-condition safety:** every request gets a monotonic id and an `AbortController`; superseded responses are discarded, so a slow early response can never overwrite a fast later one.
- Distinguishes `isLoading` (nothing on screen → full skeleton) from `isFetching` (refining → inline spinner), plus `isEmpty`, `error`, `hasSearched`, `retry()`.
- Aborts in-flight work on unmount.
- Written to satisfy the repo's `react-hooks/set-state-in-effect` ESLint rule — the debounce flag is *derived*, not set in an effect body.

### 3. `frontend/app/search/page.tsx` — the page named in the issue

- URL is the single source of truth (`?q`, `?view`, `?status`, `?network`, `?sort`, `?page`) → shareable, reload-safe, back/forward-safe.
- **`useSearchParams()` is wrapped in `<Suspense>`** — explicitly required by `.context/DEVELOPMENT_GUIDELINES.md` and `HANDOFF.md` as a production-build breaker.
- Renders idle / loading / error+retry / empty / results states and pagination.

### 4. `components/ListView.tsx`, `GridView.tsx`, `SearchStates.tsx`, `shared.tsx`

Presentational only — they receive already-fetched data ("Pass data to List/Grid views"), matching the dumb-component strategy in the guidelines. Dark-mode aware, responsive, keyboard-accessible, `aria-busy`/`role="status"` on the results region.

---

## STEP 5–8 · Validation

### Static checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `pnpm lint` (ESLint + React Compiler rules) | **0 errors, 0 warnings** |
| `pnpm build` (frontend) | **Success** — `/search` prerendered, 26 → 28 routes |
| `pnpm run build` (backend) | **Success** — no cross-package conflict |

### Live end-to-end proof against a real HTTP backend

A stand-in Express-style server returning the exact backend envelope was run on `:4555`, with the frontend started using `NEXT_PUBLIC_API_URL=http://localhost:4555`, driven by headless Chrome:

| Scenario | Result |
|---|---|
| `?q=live` (success) | Rendered **"LIVE API - Backend Certificate One / Two"** — real HTTP data, nested `manifestId`/`assetId` normalized correctly. "Sample data" badge correctly **hidden**. |
| `?q=triggerfail` (HTTP 503) | Error state: *"The StellarProof API is temporarily unavailable."* + working **Try again** |
| `?q=zzznothingmatches` | No-results state with the echoed query |
| Server request log | `q="live" -> 2`, `q="zzznothingmatches" -> 0` — well-formed queries, **no request storm** (debounce confirmed) |
| Browser console | No application errors |

Mock-mode was also verified in-browser: 2 results for `photography` in list view, 12 cards + pagination in grid view.

### Acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Search queries return correct data from the API | ✅ | Live 503/200 runs above + `SearchPage.test.tsx` "AC1" |
| Loading spinners show during fetch | ✅ | `SearchPage.test.tsx` "AC2" asserts spinner + skeleton + `aria-busy` while pending, and their removal after resolve |
| Data fetching via Axios/fetch | ✅ | Native `fetch` (no `axios` in the project; no new dependency) |
| Handle loading and error states | ✅ | `isLoading`/`isFetching`/`error`/`isEmpty` + retry |
| Pass data to List/Grid views | ✅ | Both views render from the same fetched payload |

**Confidence: ~97%.** The remaining ~3% is the one thing not verifiable from this repo: the backend `/api/v1/certificates/search` endpoint **is not implemented yet** (only `GET /api/v1/certificates?creatorId=…` and `GET /:id` exist). This is why the response parser is deliberately tolerant of field-name and pagination variations, and why mock mode is the default until `NEXT_PUBLIC_API_URL` is set — the page ships working either way, and needs no UI change when the endpoint lands.

---

## STEP 10 · Test results

```
Test Suites: 6 failed, 8 passed, 14 total
Tests:       2 failed, 79 passed, 81 total
```

**All 41 new tests pass.** The 6 failing suites are **pre-existing and unrelated** — identical before my change:

| Baseline (before) | After |
|---|---|
| 6 failed / 5 passed, 11 suites | 6 failed / **8 passed**, 14 suites |
| 2 failed / 38 passed, 40 tests | 2 failed / **79 passed**, 81 tests |

Two independent root causes, both untouched by this work:

1. **4 suites — broken jest config.** `jest.config.ts` maps `'^@/(.*)$' → '<rootDir>/src/$1'`, but there is no `frontend/src/` directory. Proven: temporarily changing it to `<rootDir>/$1` makes all 4 pass (then reverted).
2. **2 suites — genuine assertion bugs.** e.g. `ProviderList.test.tsx` expects `GCAABB...6789ABCD` (8 tail chars) but `truncateAddress()` slices 6 → `...9ABCD`.

I left both alone deliberately: fixing unrelated failures inside a feature PR would muddy review and expand scope beyond `Closes #377`. They are worth separate issues. My new tests import via **relative paths**, so they pass regardless of that config bug.

> Note: `ts-node` had to be installed locally to run Jest at all (`jest.config.ts` requires it but it isn't in `devDependencies`). This is another pre-existing gap; I did **not** commit a `package.json` change for it, to keep the diff scoped.

---

## STEP 11 · Files changed

**Modified: none.** No existing file was edited, so there is no regression surface in existing features.

**Created (10 files):**

| File | Lines | Purpose |
|---|---|---|
| `frontend/services/searchService.ts` | 817 | API integration, normalization, typed errors, mock fallback |
| `frontend/hooks/useCertificateSearch.ts` | 219 | Debounce, loading/error state, abort/race safety, retry |
| `frontend/app/search/page.tsx` | 570 | The page from the issue; URL state, Suspense, orchestration |
| `frontend/app/search/components/ListView.tsx` | 158 | List rendering + skeleton |
| `frontend/app/search/components/GridView.tsx` | 182 | Grid rendering + skeleton |
| `frontend/app/search/components/SearchStates.tsx` | 148 | Idle / empty / error+retry states |
| `frontend/app/search/components/shared.tsx` | 222 | Badges, copy-hash, spinner, formatters |
| `frontend/services/__tests__/searchService.test.ts` | 383 | 22 tests — endpoint, envelope, errors, mock engine |
| `frontend/hooks/useCertificateSearch.test.tsx` | 219 | 9 tests — loading, error, retry, debounce, abort |
| `frontend/app/search/__tests__/SearchPage.test.tsx` | 280 | 10 tests — AC1, AC2, grid/list, filters, pagination |

### Configuration

Optional — the page runs on sample data without it:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Expected endpoint:

```
GET /api/v1/certificates/search?q=&page=&limit=&skip=&status=&network=&sort=
→ { "success": true, "data": { "certificates": [...], "total": n, "limit": n, "skip": n } }
```

### Suggested follow-ups (out of scope for #377)

1. Implement `GET /api/v1/certificates/search` in `certificate.controller.ts` / `.service.ts`.
2. Fix `jest.config.ts` `moduleNameMapper` (`<rootDir>/src/$1` → `<rootDir>/$1`) — unblocks 4 suites.
3. Add `ts-node` to `frontend` devDependencies so `pnpm test` runs out of the box.
4. Fix the `ProviderList` / `ExportActions` assertion bugs.
5. Add a `/search` link to `components/Header.tsx` nav.
