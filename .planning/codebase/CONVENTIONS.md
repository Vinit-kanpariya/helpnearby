# Coding Conventions

**Analysis Date:** 2026-04-16

## Linting and Formatting Tools

**No ESLint or Prettier config files are present** in the repository. There is no `.eslintrc.*`, `.prettierrc`, `eslint.config.*`, or `biome.json` at any level of the project. Code style is enforced only through TypeScript's compiler and developer discipline.

**Implication:** When adding code, match the visual style observed in the existing files. There is no automated formatter to catch deviations.

## TypeScript Strictness

**Client (`client/tsconfig.json`):**
- `"strict": true` — enables all strict checks (strictNullChecks, noImplicitAny, etc.)
- `"noUnusedLocals": false` — unused variables are silently permitted
- `"noUnusedParameters": false` — unused function parameters are silently permitted
- `"noFallthroughCasesInSwitch": true`
- `"isolatedModules": true` — each file must be a self-contained module

**Server (`server/tsconfig.json`):**
- `"strict": true`
- `"esModuleInterop": true`
- No unused variable enforcement either

**Key implication:** `strict: true` means all types must be explicit and nullable types must be handled. The use of `catch (err: any)` in several page components is a known escape hatch for the strict mode typing requirement on caught errors.

## Naming Patterns

**Files:**
- React components: PascalCase — `RequestCard.tsx`, `BottomNav.tsx`, `AuthContext.tsx`
- Page components: PascalCase — `BrowseFeed.tsx`, `PostRequest.tsx`, `RequestDetail.tsx`
- Server routes: camelCase — `auth.ts`, `requests.ts`, `chat.ts`
- Server models: PascalCase — `User.ts`, `HelpRequest.ts`, `Message.ts`
- Server middleware: camelCase — `auth.ts`
- Utility/config files: camelCase — `db.ts`

**Functions and variables:**
- camelCase throughout — `handleSubmit`, `setLoading`, `generateToken`, `authMiddleware`
- Boolean state names use `is`/`show`/`loading` prefix — `isOwner`, `alreadyOffered`, `showSuggestions`, `loading`
- Event handlers prefixed with `handle` — `handleSubmit`, `handleGoogleLogin`, `handleLocationChange`, `handleLocationInput`

**Types and Interfaces:**
- PascalCase — `User`, `HelpRequest`, `Offer`, `Message`, `Notification`, `Conversation`
- Server model interfaces prefixed with `I` — `IUser`, `IHelpRequest` (in `server/src/models/`)
- Client-side types use plain names without prefix — `User`, `HelpRequest` (in `client/src/types.ts`)
- Context type interfaces appended with `Type` — `AuthContextType`, `SocketContextType`

**Constants (module-level):**
- camelCase for option arrays — `rewardTypes`, `navLinks`, `distances`, `rewardOptions`
- UPPER_CASE is not used

## Component Structure Pattern

All React components are **default-exported function components** declared with the `function` keyword (not arrow functions at the top level):

```tsx
// Standard pattern — named function, default export
export default function ComponentName({ prop }: { prop: Type }) {
  // 1. Context/hook calls
  const { user } = useAuth();
  const navigate = useNavigate();

  // 2. useState declarations (grouped)
  const [value, setValue] = useState<Type>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 3. Refs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 4. useEffect blocks
  useEffect(() => { /* ... */ }, []);

  // 5. Derived values / useMemo
  const displayed = useMemo(() => { /* ... */ }, [deps]);

  // 6. Event handlers (prefixed with handle)
  const handleSubmit = async (e: React.FormEvent) => { /* ... */ };

  // 7. JSX return
  return ( /* ... */ );
}
```

**Contexts** follow a consistent Provider + hook export pattern:
```tsx
// Pattern used in AuthContext.tsx and SocketContext.tsx
const SomeContext = createContext<SomeContextType | null>(null);

export function SomeProvider({ children }: { children: ReactNode }) {
  // state and logic
  return <SomeContext.Provider value={{ ... }}>{children}</SomeContext.Provider>;
}

export function useSome() {
  const ctx = useContext(SomeContext);
  if (!ctx) throw new Error("useSome must be used within SomeProvider");
  return ctx;
}
```

**Non-auth contexts** (e.g., `SocketContext`) create the context with a default value rather than `null`, omitting the null-guard in the hook.

## Import Conventions

**No path aliases are configured.** All imports use relative paths:

```tsx
// Client pattern — relative paths from the importing file
import { useAuth } from "../contexts/AuthContext";
import type { HelpRequest } from "../types";
import { getRequests } from "../services/api";
import Navbar from "../components/Navbar";
```

**Import grouping order (observed, not enforced):**
1. React core — `import { useState, useEffect } from "react"`
2. Third-party libraries — `import { Link, useNavigate } from "react-router-dom"`, icons
3. Internal contexts — `import { useAuth } from "../contexts/AuthContext"`
4. Internal components — `import Navbar from "../components/Navbar"`
5. Internal services — `import { getRequests } from "../services/api"`
6. Type-only imports — `import type { HelpRequest } from "../types"` (using `import type`)

**Server import grouping:**
1. Node built-ins — `import http from "http"`
2. Third-party packages — `import express from "express"`, `import jwt from "jsonwebtoken"`
3. Internal modules — `import { authMiddleware, AuthRequest } from "../middleware/auth"`
4. Models — `import User from "../models/User"`

**Type imports:** The `import type` syntax is used on the client for type-only imports (`import type { HelpRequest } from "../types"`). Not consistently used on the server.

## State Management Pattern

**Client state is managed entirely with React built-ins.** No Zustand, Redux, Recoil, or similar libraries are present.

**Global state via React Context:**
- `AuthContext` (`client/src/contexts/AuthContext.tsx`) — user session, token, login/logout/register actions
- `SocketContext` (`client/src/contexts/SocketContext.tsx`) — Socket.io connection and online status

**Local component state via `useState`:** All page-level data fetching, form state, filter state, and loading/error states are managed with `useState` inside the component.

**Derived state via `useMemo`:** Used in `BrowseFeed.tsx` to compute filtered/sorted request lists from raw state without re-fetching.

**No global form library** (no React Hook Form, Formik, etc.). Forms use controlled inputs with individual `useState` variables.

## Error Handling Patterns

**Client — async form submissions:**
```tsx
// Standard page-level pattern (Login.tsx, SignUp.tsx)
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    await someApiCall();
    navigate("/browse");
  } catch (err: any) {
    setError(err.response?.data?.message || "Fallback error message.");
  } finally {
    setLoading(false);
  }
};
```

**Client — background/non-critical fetches:** Errors are silently swallowed with `.catch(() => {})`:
```tsx
// Used for stats, profile preloads — failures are non-blocking
getStats()
  .then((res) => setStats(res.data))
  .catch(() => {});
```

**Client — axios 401 global handler:** Defined in `client/src/services/api.ts`. Any 401 response clears localStorage and redirects to `/login` automatically.

**Server — route handlers:** All async route handlers wrap logic in `try/catch`. Catch blocks return `res.status(500).json({ message: "Server error" })`. Specific error cases (404, 400, 403) use explicit early-return responses before the try block or inside it.

```ts
// Standard server route error pattern (routes/auth.ts, routes/requests.ts)
router.get("/path", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await Model.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json({ item });
  } catch (error) {
    console.error("[context]", error);  // only auth.ts logs; others don't
    res.status(500).json({ message: "Server error" });
  }
});
```

**Server — validation errors:** `express-validator` results are checked at the top of handlers before any database access. First error message is returned: `errors.array()[0].msg`.

## Comment and Documentation Style

**No JSDoc or TSDoc.** No function-level documentation comments exist anywhere in the codebase.

**Inline comments are used sparingly** for non-obvious logic:
- Section labels in `api.ts` (`// Auth`, `// Requests`, `// Users`)
- Inline explanations for non-trivial conditions (`// [lon, lat]`, `// skip posts with no coords`)
- Route comments in server files (`// POST /api/auth/register`, `// GET /api/requests/:id`)
- Intent comments in context files (`// Run once on mount to restore session from localStorage.`)

**JSX section comments** using `{/* Header row */}` style are used within long component returns to delineate visual regions.

## Code Style (Spacing and Formatting)

Based on the files observed (no formatter enforced these — they reflect manual style):

- **Indentation:** 2 spaces throughout
- **Quotes:** Double quotes for JSX attributes and string literals
- **Semicolons:** Present at end of statements
- **Trailing commas:** Used in multi-line objects and arrays
- **Arrow function bodies:** Prefer concise form when single expression; braces for multi-line
- **Template literals:** Used for string interpolation
- **Optional chaining:** Used liberally — `err.response?.data?.message`, `request.location?.address`
- **Nullish coalescing:** Used for defaults — `request.rewardAmount || ""`, `process.env.PORT || 5000`

## Tailwind Usage Pattern

All styling is done via Tailwind CSS utility classes directly in JSX. No CSS modules or styled-components. Custom Tailwind tokens defined in the project config are referenced as `brand-dark`, `brand-light`, `brand-bg`, `brand-card-border`, `brand-card-bg`, `gray-text`, `gray-muted`, `gray-secondary`, `gray-placeholder`.

Responsive variants use `max-md:`, `max-lg:`, `max-xl:` prefix modifiers for mobile-first overrides.

---

*Convention analysis: 2026-04-16*
