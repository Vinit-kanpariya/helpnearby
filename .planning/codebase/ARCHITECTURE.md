# Architecture

**Analysis Date:** 2026-04-16

## Pattern Overview

**Overall:** Full-stack monorepo — traditional client/server split with a React SPA frontend
and an Express REST + Socket.IO backend. Both packages are developed and launched from a
shared root `package.json` using `concurrently`. There are no microservices; all server-side
logic lives in a single Node process.

**Key Characteristics:**
- SPA client served by Vite (port 5173) proxies `/api` and `/socket.io` to the Express server (port 5000)
- Server exposes a REST API under `/api/*` and a Socket.IO namespace at the root `/`
- MongoDB (Mongoose) is the sole data store; no caching layer
- JWT-based stateless authentication shared between REST and WebSocket transports
- React Context provides all client-side state — no Redux or other external store

## Layers

**Client — Pages:**
- Purpose: Full-page route components, each owning local state and data fetching
- Location: `client/src/pages/`
- Contains: `BrowseFeed.tsx`, `PostRequest.tsx`, `RequestDetail.tsx`, `Chat.tsx`, `Profile.tsx`, `Notifications.tsx`, `Settings.tsx`, `Login.tsx`, `SignUp.tsx`, `Landing.tsx`, `About.tsx`
- Depends on: `services/api.ts`, `contexts/AuthContext.tsx`, `contexts/SocketContext.tsx`, `components/`
- Used by: `App.tsx` router

**Client — Components:**
- Purpose: Reusable UI primitives and layout elements
- Location: `client/src/components/`
- Contains: `Navbar.tsx`, `BottomNav.tsx`, `RequestCard.tsx`, `ProtectedRoute.tsx`
- Depends on: `contexts/AuthContext.tsx`
- Used by: Pages

**Client — Contexts:**
- Purpose: Application-wide state shared via React Context
- Location: `client/src/contexts/`
- Contains: `AuthContext.tsx` (user session, token), `SocketContext.tsx` (Socket.IO connection)
- Depends on: `services/api.ts`
- Used by: All pages and components that need auth or real-time events

**Client — Services:**
- Purpose: Typed HTTP client functions — the only layer that calls the API
- Location: `client/src/services/api.ts`
- Contains: All axios calls grouped by domain (auth, requests, users, notifications, chat)
- Depends on: axios, `localStorage` for token retrieval
- Used by: Contexts and pages directly

**Server — Routes:**
- Purpose: Express route handlers; business logic lives inline within handler callbacks
- Location: `server/src/routes/`
- Contains: `auth.ts`, `requests.ts`, `users.ts`, `notifications.ts`, `chat.ts`
- Depends on: Models, `middleware/auth.ts`
- Used by: `server.ts` (mounted under `/api`)

**Server — Models:**
- Purpose: Mongoose schema definitions and document interfaces
- Location: `server/src/models/`
- Contains: `User.ts`, `HelpRequest.ts`, `Message.ts`, `Notification.ts`
- Depends on: mongoose
- Used by: Routes, socket handler

**Server — Middleware:**
- Purpose: Express middleware for cross-cutting concerns
- Location: `server/src/middleware/auth.ts`
- Contains: `authMiddleware` — JWT verification, attaches `req.userId`
- Depends on: jsonwebtoken
- Used by: All protected route handlers

**Server — Socket:**
- Purpose: Real-time bidirectional chat over Socket.IO
- Location: `server/src/socket/chat.ts`
- Contains: `setupSocket()` — connection auth, `sendMessage`, `typing`, `messageRead` events
- Depends on: Models (`Message`, `Notification`), jsonwebtoken
- Used by: `server.ts` at startup

**Server — Config:**
- Purpose: Infrastructure setup
- Location: `server/src/config/db.ts`
- Contains: `connectDB()` — Mongoose connection using `MONGODB_URI`
- Used by: `server.ts` at startup

## Data Flow

**Authenticated REST Request:**

1. Page component calls a function from `client/src/services/api.ts`
2. Axios interceptor reads JWT from `localStorage`, adds `Authorization: Bearer <token>` header
3. Vite dev-server proxy forwards `/api/*` to `http://localhost:5000`
4. Express routes the request to the matching handler in `server/src/routes/`
5. `authMiddleware` verifies the JWT and attaches `req.userId`
6. Handler queries MongoDB via Mongoose model, returns JSON
7. On 401 response, the Axios response interceptor clears `localStorage` and redirects to `/login`

**Real-Time Chat Flow:**

1. `SocketContext` (client) opens a Socket.IO connection on mount when `user` and `token` are present; passes `{ auth: { token } }` in the handshake
2. Socket.IO server middleware in `server/src/socket/chat.ts` verifies the JWT and attaches `socket.userId`
3. Client emits `join` with the user's `_id`; server adds the socket to a personal room named after that ID
4. Client emits `sendMessage`; server persists a `Message` document, emits `newMessage` to the receiver's room, and creates a `Notification` document
5. Typing indicators are relayed via `typing` / `userTyping` events without persistence

**State Management:**

- `AuthContext` holds `user: User | null`, `token: string | null`, `loading: boolean`
- On mount, restores session: reads token from `localStorage`, calls `GET /api/auth/me`, sets user
- `SocketContext` derives its connection from `AuthContext` — socket is created/destroyed reactively when user logs in or out
- All other state (lists, form values, etc.) is local to individual page components via `useState` / `useEffect`

## Authentication / Authorization

**Mechanism:** JWT (30-day expiry) stored in `localStorage`

**Registration/Login flow:**
- `POST /api/auth/register` or `POST /api/auth/login` → server validates with `express-validator`, checks password via `bcryptjs`, returns `{ token, user }`
- Google OAuth: `POST /api/auth/google` verifies a Google ID token via `google-auth-library`, upserts a user record, returns same `{ token, user }` shape

**Server enforcement:**
- `authMiddleware` in `server/src/middleware/auth.ts` decodes the JWT, sets `req.userId`
- Applied per-route (not globally); public routes like `GET /api/requests` and `GET /api/requests/:id` do not require authentication
- Socket.IO uses its own identical JWT check in the `io.use()` middleware in `server/src/socket/chat.ts`

**Client enforcement:**
- `ProtectedRoute` component (`client/src/components/ProtectedRoute.tsx`) wraps private routes; redirects to `/login` if `user` is null after loading
- Routes protected: `/post`, `/chat`, `/profile`, `/notifications`, `/settings`

**Password security:**
- Passwords hashed with bcrypt (12 salt rounds) in a Mongoose `pre('save')` hook in `server/src/models/User.ts`
- `toJSON` transform strips password from all serialised User documents

## Key Design Patterns

**React Context + Custom Hooks:**
- `useAuth()` and `useSocket()` are the canonical way to access shared state
- Both throw if called outside their provider (`useAuth` throws; `useSocket` returns a default null-socket object)

**Axios Singleton with Interceptors (`client/src/services/api.ts`):**
- Single axios instance with `baseURL: "/api"` used for all HTTP calls
- Request interceptor injects the auth token automatically
- Response interceptor handles global 401 by logging the user out and redirecting

**Mongoose Document Pattern:**
- Each model file exports a default Mongoose model and a TypeScript `Document` interface (e.g., `IUser`, `IHelpRequest`)
- Embedded sub-documents used for `offers[]` within `HelpRequest` (no separate Offer collection)
- `{ timestamps: true }` on all schemas provides `createdAt` / `updatedAt`

**Route-level inline handlers:**
- No separate service or repository layer; business logic (find, create, save, notification creation) is written directly inside Express route callbacks
- `express-validator` body validation applied inline on POST routes

**Protected Route Wrapper:**
- `ProtectedRoute` component reads loading state to avoid premature redirects during session restore

## Entry Points and Request Lifecycle

**Server entry:** `server/src/server.ts`
1. Loads `.env` from project root
2. Creates Express app + HTTP server
3. Applies CORS and `express.json()` middleware globally
4. Mounts all route modules under `/api`
5. Registers `/api/health` and `/api/stats` inline
6. Calls `setupSocket(server)` to attach Socket.IO
7. `start()` connects to MongoDB then calls `server.listen(PORT)`

**Client entry:** `client/src/main.tsx`
1. Renders `<BrowserRouter>` → `<AuthProvider>` → `<SocketProvider>` → `<App />`
2. `App.tsx` defines all `<Route>` mappings; private routes wrapped in `<ProtectedRoute>`
3. `AuthProvider` runs `useEffect` on mount to restore session from `localStorage`
4. `SocketProvider` runs `useEffect` whenever `user` or `token` changes, opening or closing the Socket.IO connection accordingly

---

*Architecture analysis: 2026-04-16*
