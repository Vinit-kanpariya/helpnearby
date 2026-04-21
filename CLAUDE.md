# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + server + client)
npm run install:all

# Start full dev environment (server on :5000, client on :5173)
npm run dev

# Run only the server (nodemon + ts-node hot-reload)
npm run dev:server

# Run only the client (Vite dev server)
npm run dev:client

# Build client for production
npm run build

# Build server (TypeScript → dist/)
cd server && npm run build

# Start production server
cd server && npm start
```

No test or lint commands exist in this project.

## Architecture

HelpNearby is a full-stack community help marketplace. Users post requests (moving, groceries, tutoring, etc.), others submit offers to help, and requesters accept/reject. Includes real-time chat and notifications.

**Structure:**
- `client/` — React 18 SPA built with Vite, TypeScript, Tailwind CSS
- `server/` — Express 4 REST API + Socket.IO, TypeScript, Mongoose/MongoDB
- `.planning/codebase/` — Detailed architecture docs (ARCHITECTURE.md, CONVENTIONS.md, etc.)

**Client (`client/src/`):**
- `App.tsx` — All route definitions; public routes + `ProtectedRoute`-wrapped private routes
- `pages/` — Full-page components; business logic lives here (no service layer)
- `components/` — Small reusable UI components
- `contexts/` — `AuthContext` (JWT + user state) and `SocketContext` (Socket.IO connection)
- `services/api.ts` — Axios singleton with `baseURL: "/api"`, auto-injects JWT from `localStorage`, redirects to `/login` on 401
- `types.ts` — All shared TypeScript interfaces

**Server (`server/src/`):**
- `server.ts` — Express app, Socket.IO setup, route mounting
- `routes/` — Five modules: `auth`, `requests`, `users`, `notifications`, `chat`; business logic is inline in handlers
- `models/` — Mongoose schemas: `User`, `HelpRequest`, `Message`, `Notification`
- `middleware/auth.ts` — JWT verification middleware; applied per-route (not globally)
- `socket/` — Socket.IO event handling; JWT verified in connection middleware

**Key patterns:**
- Auth: JWT (30-day expiry) stored in `localStorage`; bcrypt (12 rounds) for passwords; Google OAuth2 via `google-auth-library`
- Real-time: Socket.IO; client connects via `SocketContext` when authenticated; messages persisted to MongoDB
- Vite dev proxy forwards `/api` and `/socket.io` requests to `:5000`
- No Redux/Zustand — global state via React Context only
- No path aliases — all imports use relative paths
- No shared type definitions between client and server; each defines its own