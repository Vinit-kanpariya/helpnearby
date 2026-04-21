# Technology Stack

**Analysis Date:** 2026-04-16

## Languages

**Primary:**
- TypeScript 5.5.x - Used across both client (`client/src/`) and server (`server/src/`)

**Secondary:**
- JavaScript - `tailwind.config.js`, `postcss.config.js` (config files only)
- CSS - `client/src/index.css` (minimal, utility-first via Tailwind)

## Runtime

**Environment:**
- Node.js - Server runtime (`server/src/server.ts`)
- Browser (ES2020 target) - Client runtime

**Package Manager:**
- npm - used across root, client, and server workspaces
- Lockfiles: Not confirmed present (check `package-lock.json` in each workspace)

## Monorepo Layout

Root `package.json` is a thin orchestration wrapper. There is no shared/common package. Each workspace is self-contained:
- `package.json` — root, dev orchestration only
- `client/package.json` — frontend
- `server/package.json` — backend

Root dev dependency:
- `concurrently ^8.2.2` — runs client and server dev processes in parallel via `npm run dev`

## Frameworks

**Client:**
- React `^18.3.1` — UI framework, using functional components and hooks throughout
- React DOM `^18.3.0` — rendering
- React Router DOM `^6.26.0` — client-side routing (`client/src/App.tsx`)

**Server:**
- Express `^4.19.2` — HTTP server and REST API (`server/src/server.ts`)
- Socket.IO `^4.7.5` (server) — WebSocket server (`server/src/socket/chat.ts`)

**Styling:**
- Tailwind CSS `^3.4.10` — utility-first CSS, extended with custom brand color tokens (`client/tailwind.config.js`)
- PostCSS `^8.4.41` — Tailwind pipeline processor (`client/postcss.config.js`)
- Autoprefixer `^10.4.20` — CSS vendor prefixing
- Custom font: `Outfit` (referenced in Tailwind config, loaded externally)

## Build Tools

**Client:**
- Vite `^5.4.2` — dev server (port 5173) and production bundler (`client/vite.config.ts`)
  - Plugin: `@vitejs/plugin-react ^4.3.1` — JSX transform (using the new `react-jsx` transform)
  - Dev proxy: `/api` → `http://localhost:5000`, `/socket.io` → `http://localhost:5000` (WebSocket)
  - Build command: `tsc -b && vite build` — type-checks before bundling

**Server:**
- `ts-node ^10.9.2` — TypeScript execution in development
- `nodemon ^3.1.4` — file-watching dev runner (`nodemon --exec ts-node src/server.ts`)
- `tsc` — TypeScript compiler for production build, outputs to `server/dist/`
- Production start: `node dist/server.js`

## TypeScript Configuration

**Client (`client/tsconfig.json`):**
- Target: `ES2020`, module: `ESNext`, moduleResolution: `bundler`
- `strict: true`, `noEmit: true` (Vite handles emit)
- JSX: `react-jsx`

**Server (`server/tsconfig.json`):**
- Target: `ES2020`, module: `commonjs`
- `strict: true`, `esModuleInterop: true`
- Output: `server/dist/`

## Key Dependencies

### Client Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | `^18.3.1` | UI framework |
| `react-dom` | `^18.3.1` | DOM rendering |
| `react-router-dom` | `^6.26.0` | Client-side routing |
| `socket.io-client` | `^4.7.5` | WebSocket client for real-time chat |
| `axios` | `^1.7.4` | HTTP client; configured in `client/src/services/api.ts` |
| `lucide-react` | `^0.441.0` | Icon library |

### Client Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vite` | `^5.4.2` | Bundler / dev server |
| `@vitejs/plugin-react` | `^4.3.1` | React JSX transform for Vite |
| `typescript` | `^5.5.4` | TypeScript compiler |
| `tailwindcss` | `^3.4.10` | CSS framework |
| `postcss` | `^8.4.41` | CSS processing pipeline |
| `autoprefixer` | `^10.4.20` | CSS vendor prefixes |
| `@types/react` | `^18.3.3` | React type definitions |
| `@types/react-dom` | `^18.3.0` | React DOM type definitions |

### Server Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | `^4.19.2` | HTTP/REST API server |
| `socket.io` | `^4.7.5` | WebSocket server |
| `mongoose` | `^8.5.2` | MongoDB ODM |
| `jsonwebtoken` | `^9.0.2` | JWT creation and verification |
| `bcryptjs` | `^2.4.3` | Password hashing (12 salt rounds) |
| `cors` | `^2.8.5` | CORS middleware |
| `dotenv` | `^16.4.5` | Environment variable loading |
| `express-validator` | `^7.1.0` | Request body validation |
| `google-auth-library` | `^10.6.2` | Google OAuth2 token verification |

### Server Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `^5.5.4` | TypeScript compiler |
| `ts-node` | `^10.9.2` | Run TypeScript directly in dev |
| `nodemon` | `^3.1.4` | Dev file watcher |
| `@types/bcryptjs` | `^2.4.6` | bcryptjs types |
| `@types/cors` | `^2.8.17` | cors types |
| `@types/express` | `^4.17.21` | Express types |
| `@types/jsonwebtoken` | `^9.0.6` | JWT types |
| `@types/node` | `^22.1.0` | Node.js types |

## Dev vs Prod Distinction

**Client:** All Tailwind, PostCSS, TypeScript, Vite, and `@types/*` packages are `devDependencies`. Only React, React Router, socket.io-client, axios, and lucide-react ship in the browser bundle.

**Server:** `ts-node`, `nodemon`, and all `@types/*` packages are `devDependencies`. The compiled `dist/` output runs in production without them.

## Notable Version Constraints

- Socket.IO client (`^4.7.5`) and server (`^4.7.5`) are pinned to matching major versions — required for protocol compatibility.
- React 18.3.x is the current stable branch; no React 19 features used.
- TypeScript 5.5.x is consistent across both workspaces.
- `@types/node ^22.1.0` targets Node.js 22 LTS APIs.
- No `engines` field defined in any `package.json` — Node version is unconstrained.

---

*Stack analysis: 2026-04-16*
