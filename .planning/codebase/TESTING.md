# Testing Patterns

**Analysis Date:** 2026-04-16

## Test Framework

**No testing framework is installed.**

A search of all `package.json` files (`client/package.json`, `server/package.json`, root `package.json`) reveals zero test-related dependencies:

- No Jest, Vitest, Mocha, Jasmine, or any test runner
- No @testing-library/react, @testing-library/jest-dom, or similar
- No Cypress, Playwright, Puppeteer, or any E2E framework
- No Supertest, nock, msw, or API mocking libraries
- No Istanbul or c8 for coverage

## Test Files

**Zero test files exist** in the repository. A search for `*.test.*` and `*.spec.*` files returns no results across the entire codebase.

```
client/src/   → 0 test files
server/src/   → 0 test files
```

## Test Scripts in package.json

**No test scripts are defined** in any `package.json`:

`client/package.json` scripts:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview"
}
```

`server/package.json` scripts:
```json
{
  "dev": "nodemon --exec ts-node src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

There is no `"test"` key in any scripts block. Running `npm test` in any package will fall back to the npm default error (`"Error: no test specified"`).

## Estimated Test Coverage

**0%** — No tests exist. No part of the application has automated test coverage.

## Types of Tests Present

| Type | Present | Notes |
|------|---------|-------|
| Unit tests | No | No utility functions, hooks, or services are tested |
| Component tests | No | No React component rendering tests |
| Integration tests | No | No API route tests |
| E2E tests | No | No browser automation |
| Contract tests | No | No API schema validation tests |

## What Is NOT Tested (Gaps)

Since nothing is tested, the following areas represent the highest-risk gaps based on business criticality:

**Authentication logic (`server/src/routes/auth.ts`, `client/src/contexts/AuthContext.tsx`):**
- JWT generation and verification
- Password hashing and comparison (`bcryptjs`)
- Google OAuth token verification flow
- Token expiry and localStorage cleanup
- `useAuth()` context state transitions (login → browse → logout)

**Core API routes (`server/src/routes/requests.ts`, `server/src/routes/users.ts`):**
- Offer submission and duplicate offer prevention
- Offer acceptance/rejection state transitions (`active` → `in_progress`)
- Request completion and notification side effects
- Authorization guards (only requester can accept offers, complete request)
- Mongoose query correctness for filter/sort/populate

**Client data filtering (`client/src/pages/BrowseFeed.tsx`):**
- `haversineKm()` distance calculation function — pure function, easily testable
- `distanceLimitKm()` mapping function — pure function, easily testable
- `useMemo` filtering pipeline (distance, reward type, sort order)

**Socket.io real-time logic (`server/src/socket/chat.ts`):**
- Message persistence to MongoDB on `sendMessage` event
- Notification creation side effect
- Room join / personal room delivery
- `messageRead` bulk update

**Client error handling:**
- 401 interceptor redirect behavior (`client/src/services/api.ts`)
- Silent `.catch(() => {})` failures in background fetches — currently undetectable
- `catch (err: any)` user-facing error display logic

**Mongoose models (`server/src/models/`):**
- `User.ts` — pre-save password hash hook
- `User.ts` — `comparePassword()` method
- `User.ts` — `toJSON()` transform stripping password
- `HelpRequest.ts` — enum validation for `status`, `category`, `rewardType`

**Protected routing (`client/src/components/ProtectedRoute.tsx`):**
- Redirect to `/login` when unauthenticated
- Loading spinner shown during auth resolution

## Mocking Strategies

**None established.** No mocking infrastructure, factories, or fixture files exist. If tests were added, the following would need mocking strategies:

- **Mongoose models** — would require `mongodb-memory-server` or `jest.mock()` for unit tests, or a test MongoDB instance for integration tests
- **JWT operations** — would use a fixed test secret
- **axios calls** — would use `msw` (Mock Service Worker) or `axios-mock-adapter` for component tests
- **Socket.io** — would require `socket.io-mock` or test server setup
- **`navigator.geolocation`** — browser API, would need jest `jsdom` global mock
- **`window.google`** — Google Identity Services SDK, would need manual mock in test setup

## Recommended Test Infrastructure (If Adding Tests)

**For the client (Vite project):**
```bash
# Install
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event msw

# vitest.config.ts addition to vite.config.ts
test: {
  environment: "jsdom",
  globals: true,
  setupFiles: ["./src/test/setup.ts"],
}
```

**For the server (Node/Express):**
```bash
# Install
npm install -D jest @types/jest ts-jest supertest @types/supertest mongodb-memory-server

# jest.config.ts
{
  preset: "ts-jest",
  testEnvironment: "node",
  globalSetup: "./src/test/globalSetup.ts",  // start in-memory MongoDB
}
```

**Highest-priority first tests to write:**
1. `server/src/routes/auth.ts` — register, login, token validation (integration, Supertest)
2. `client/src/pages/BrowseFeed.tsx` — `haversineKm()` and `distanceLimitKm()` (unit, Vitest)
3. `client/src/contexts/AuthContext.tsx` — login/logout state (component, Testing Library)
4. `server/src/models/User.ts` — password hashing hook and `comparePassword` (unit, mongodb-memory-server)
5. `server/src/routes/requests.ts` — offer submission and duplicate prevention (integration, Supertest)

## CI/CD

No CI pipeline configuration exists (no `.github/workflows/`, no `Jenkinsfile`, no `Dockerfile` with test stages). There is no automated test execution on commit or pull request.

---

*Testing analysis: 2026-04-16*
