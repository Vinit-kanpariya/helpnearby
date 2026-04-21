# External Integrations

**Analysis Date:** 2026-04-16

## APIs & External Services

### Google OAuth2

- **Purpose:** Social sign-in ("Continue with Google")
- **Client-side:** Google Identity Services JS SDK loaded via `<script>` tag in HTML; accessed via `window.google.accounts.id`. Configured in `client/src/pages/Login.tsx` and `client/src/pages/SignUp.tsx`.
- **Server-side:** `google-auth-library ^10.6.2` — `OAuth2Client.verifyIdToken()` validates the Google credential token. Implemented in `server/src/routes/auth.ts`.
- **Config:** `GOOGLE_CLIENT_ID` (server env var); `VITE_GOOGLE_CLIENT_ID` (client env var via `import.meta.env`)
- **Flow:** Client receives credential from Google prompt → sends to `POST /api/auth/google` → server verifies with Google → issues own JWT

## Data Storage

### MongoDB

- **Type:** Document database (NoSQL)
- **Connection:** Configured via `MONGODB_URI` env var; defaults to `mongodb://localhost:27017/helpnearby`
- **Client/ODM:** Mongoose `^8.5.2`
- **Connection logic:** `server/src/config/db.ts` — `mongoose.connect()` called at server startup; process exits on connection failure
- **Models (schema files):**
  - `server/src/models/User.ts` — User accounts; uses `2dsphere`-compatible location field (`{ type: "Point", coordinates: [lng, lat] }`)
  - `server/src/models/HelpRequest.ts` — Help requests posted by users
  - `server/src/models/Message.ts` — Chat messages between users
  - `server/src/models/Notification.ts` — In-app notifications

**File Storage:** Not integrated. Avatars are stored as URL strings (e.g., Google profile picture URLs) in `User.avatar`. No local or cloud file upload service is present.

**Caching:** None detected.

## Authentication & Identity

### Custom JWT Authentication

- **Library:** `jsonwebtoken ^9.0.2`
- **Token lifespan:** 30 days (`expiresIn: "30d"`)
- **Secret:** `JWT_SECRET` env var; code falls back to `"fallback_secret"` if unset (insecure — see CONCERNS.md)
- **Storage:** Client stores JWT in `localStorage` (`"token"` key); also stores serialized user as `"user"` key
- **Middleware:** `server/src/middleware/auth.ts` — reads `Authorization: Bearer <token>` header; attaches `userId` to `AuthRequest`
- **Socket auth:** Socket.IO middleware in `server/src/socket/chat.ts` reads token from `socket.handshake.auth.token` and verifies with the same secret

### Password Hashing

- **Library:** `bcryptjs ^2.4.3`
- **Cost factor:** 12 salt rounds (set in `server/src/models/User.ts` pre-save hook)
- **Comparison:** `user.comparePassword(candidate)` instance method on the User model

### Google OAuth (see above)

## Real-Time Communication

### Socket.IO (WebSocket)

- **Server:** `socket.io ^4.7.5` — initialized in `server/src/socket/chat.ts`, attached to the Node.js `http.Server` instance
- **Client:** `socket.io-client ^4.7.5` — managed via React context in `client/src/contexts/SocketContext.tsx`
- **CORS:** Origin restricted to `CLIENT_URL` env var (default: `http://localhost:5173`)
- **Dev proxy:** Vite proxies `/socket.io` to `http://localhost:5000` with `ws: true` (`client/vite.config.ts`)

**Socket events (server-defined):**

| Event (inbound) | Direction | Description |
|---|---|---|
| `join` | client → server | Client joins its personal room (user ID as room name) |
| `sendMessage` | client → server | Sends a chat message; persists to DB and creates notification |
| `typing` | client → server | Typing indicator relay |
| `messageRead` | client → server | Marks message IDs as read in DB |

| Event (outbound) | Direction | Description |
|---|---|---|
| `newMessage` | server → client | Delivers new message to receiver's room |
| `userTyping` | server → client | Relays typing indicator to receiver |
| `messagesRead` | server → client (broadcast) | Notifies that messages were read |

## REST API

### Internal API (Express)

All endpoints are prefixed `/api/`. The client communicates via an Axios instance in `client/src/services/api.ts` with base URL `/api` (proxied to `http://localhost:5000` in dev). JWT is attached via request interceptor.

**Route modules:**

| Mount path | File | Auth required |
|---|---|---|
| `/api/auth` | `server/src/routes/auth.ts` | Mixed (login/register public; `/me` protected) |
| `/api/requests` | `server/src/routes/requests.ts` | Protected |
| `/api/users` | `server/src/routes/users.ts` | Protected |
| `/api/notifications` | `server/src/routes/notifications.ts` | Protected |
| `/api/chat` | `server/src/routes/chat.ts` | Protected |
| `/api/health` | inline in `server/src/server.ts` | Public |
| `/api/stats` | inline in `server/src/server.ts` | Public |

**Auth endpoints:**
- `POST /api/auth/register` — email/password registration with `express-validator` validation
- `POST /api/auth/login` — email/password login
- `GET /api/auth/me` — fetch current user from token
- `POST /api/auth/google` — Google credential verification and user upsert

**Request interceptor (client):** Reads `localStorage.getItem("token")` and injects `Authorization: Bearer <token>`.

**Response interceptor (client):** On 401, clears localStorage and redirects to `/login`.

## Input Validation

- **Library:** `express-validator ^7.1.0`
- **Usage:** Applied to `POST /api/auth/register` and `POST /api/auth/login` in `server/src/routes/auth.ts`
- **Pattern:** `body()` validators passed as middleware array before route handler; `validationResult(req)` checked inside handler

## CORS

- **Library:** `cors ^2.8.5`
- **Configuration:** Applied globally in `server/src/server.ts`; `origin` set to `CLIENT_URL` env var; `credentials: true`

## Environment Configuration

**Server environment variables (from `.env.example`):**

| Variable | Purpose | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/helpnearby` |
| `JWT_SECRET` | JWT signing secret | *(must be set; falls back to insecure default)* |
| `PORT` | HTTP server port | `5000` |
| `CLIENT_URL` | Allowed CORS origin and Socket.IO origin | `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | *(optional; disables Google login if unset)* |

**Client environment variables (Vite `import.meta.env`):**

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for browser-side Google Identity SDK init |

`.env` files present:
- `C:\Users\STL-LT-068\Desktop\helpnearby\.env` — root-level, loaded by server via `dotenv.config({ path: "../.env" })`
- `C:\Users\STL-LT-068\Desktop\helpnearby\.env.example` — template with placeholder values
- `C:\Users\STL-LT-068\Desktop\helpnearby\client\.env` — client Vite env vars

## Webhooks & Callbacks

**Incoming:** None detected.

**Outgoing:** None detected. No HTTP calls to external webhook endpoints found.

## Monitoring & Observability

**Error Tracking:** None. No Sentry, Datadog, or equivalent SDK present.

**Logging:** `console.log` / `console.error` only. No structured logging library (Winston, Pino, etc.).

## CI/CD & Deployment

**Hosting:** Not configured. No `Dockerfile`, `railway.toml`, `vercel.json`, `render.yaml`, or platform config files detected.

**CI Pipeline:** None detected. No `.github/workflows/` or equivalent.

---

*Integration audit: 2026-04-16*
