# Codebase Structure

**Analysis Date:** 2026-04-16

## Directory Layout

```
helpnearby/                        # Monorepo root
├── .env                           # Single env file for both client and server (gitignored)
├── .env.example                   # Template: MONGODB_URI, JWT_SECRET, PORT, CLIENT_URL
├── package.json                   # Root scripts: dev, dev:server, dev:client, install:all, build
├── client/                        # React SPA (Vite + TypeScript + Tailwind)
│   ├── index.html                 # Vite HTML shell
│   ├── vite.config.ts             # Vite config — proxy /api and /socket.io to :5000
│   ├── tailwind.config.js         # Tailwind config (brand token customisation expected)
│   ├── postcss.config.js          # PostCSS for Tailwind
│   ├── tsconfig.json              # TypeScript config for client
│   ├── public/                    # Static assets served at root
│   └── src/
│       ├── main.tsx               # React entry point — mounts providers + App
│       ├── App.tsx                # Route definitions (react-router-dom v6)
│       ├── index.css              # Global CSS / Tailwind directives
│       ├── vite-env.d.ts          # Vite env type shim
│       ├── types.ts               # Shared TypeScript interfaces (User, HelpRequest, etc.)
│       ├── components/            # Reusable UI components
│       │   ├── Navbar.tsx         # Top navigation bar (desktop + mobile)
│       │   ├── BottomNav.tsx      # Mobile bottom navigation bar
│       │   ├── RequestCard.tsx    # Card UI for a single HelpRequest in feed/lists
│       │   └── ProtectedRoute.tsx # Auth guard — redirects to /login if unauthenticated
│       ├── contexts/              # React Context providers and custom hooks
│       │   ├── AuthContext.tsx    # User session state: user, token, login, logout, register, googleLogin
│       │   └── SocketContext.tsx  # Socket.IO connection state: socket, online
│       ├── pages/                 # Full-page route components
│       │   ├── Landing.tsx        # Public home page
│       │   ├── About.tsx          # Public about page
│       │   ├── Login.tsx          # Email/password + Google login form
│       │   ├── SignUp.tsx         # Registration form
│       │   ├── BrowseFeed.tsx     # Filterable list of active HelpRequests
│       │   ├── PostRequest.tsx    # Form to create a new HelpRequest
│       │   ├── RequestDetail.tsx  # Detail view, offer submission, offer accept/reject
│       │   ├── Chat.tsx           # Real-time messaging using SocketContext
│       │   ├── Notifications.tsx  # Notification list with read/unread management
│       │   ├── Profile.tsx        # Authenticated user's public profile view
│       │   └── Settings.tsx       # Edit profile, avatar, location, etc.
│       └── services/
│           └── api.ts             # Axios singleton + all typed API call functions
└── server/                        # Express + Socket.IO backend (TypeScript)
    ├── package.json               # Server-only deps: express, mongoose, socket.io, etc.
    ├── tsconfig.json              # TypeScript config for server (output to dist/)
    └── src/
        ├── server.ts              # Express app setup, route mounting, server start
        ├── config/
        │   └── db.ts              # Mongoose connectDB() function
        ├── middleware/
        │   └── auth.ts            # authMiddleware — JWT verification, sets req.userId
        ├── models/                # Mongoose schemas and TypeScript Document interfaces
        │   ├── User.ts            # User schema: name, email, password (hashed), location, rating
        │   ├── HelpRequest.ts     # HelpRequest schema: title, category, status, offers[], helper
        │   ├── Message.ts         # Message schema: sender, receiver, content, read, requestId
        │   └── Notification.ts    # Notification schema: type, title, body, relatedRequest, relatedUser
        ├── routes/                # Express Router modules, each mounted under /api/<name>
        │   ├── auth.ts            # /api/auth — register, login, me, google
        │   ├── requests.ts        # /api/requests — CRUD, offer submit/accept/reject, complete
        │   ├── users.ts           # /api/users — profile get/update, public profile by id
        │   ├── notifications.ts   # /api/notifications — list, mark read, mark all read
        │   └── chat.ts            # /api/chat — conversations list, message history
        └── socket/
            └── chat.ts            # Socket.IO setup: auth, sendMessage, typing, messageRead events
```

## Directory Purposes

**`client/src/types.ts`:**
- Purpose: Single source of truth for shared TypeScript interfaces used across all client pages and components
- Contains: `User`, `HelpRequest`, `Offer`, `Message`, `Notification`, `Conversation`
- Key note: These mirror the Mongoose model shapes but are standalone TS interfaces (not imported from server)

**`client/src/components/`:**
- Purpose: Reusable presentational components and guards
- `Navbar.tsx` and `BottomNav.tsx` handle responsive navigation; `Navbar` is used on desktop, `BottomNav` on mobile
- `RequestCard.tsx` renders a single HelpRequest summary for feed and list views
- `ProtectedRoute.tsx` is an auth guard component — import and wrap any private `<Route>` element

**`client/src/contexts/`:**
- Purpose: Cross-cutting state that multiple pages need
- `AuthContext.tsx` is the primary state root; `SocketContext.tsx` depends on it
- Both export a Provider component and a `use*` custom hook — always use the hook, not `useContext` directly

**`client/src/pages/`:**
- Purpose: Each file is a full route screen; owns its own local state and data-fetching logic via `useEffect`
- Business logic (API calls, socket event listeners) is colocated with the page that needs it, not abstracted elsewhere

**`client/src/services/api.ts`:**
- Purpose: The only file that touches axios; exports one typed function per API endpoint
- All functions return the full axios `AxiosResponse`; callers access data via `res.data.*`

**`server/src/routes/`:**
- Purpose: Express Router instances; handlers are async inline functions
- Business logic (DB queries, notification creation) lives directly in route handlers — no separate service layer
- `authMiddleware` is applied per-route as a second argument, not globally

**`server/src/models/`:**
- Purpose: Mongoose schema definitions with TypeScript `Document` interfaces exported alongside the compiled model
- `User.ts` includes a `pre('save')` bcrypt hook and a `toJSON` transform that strips `password`
- `HelpRequest.ts` uses an embedded `offers[]` sub-document array (no separate Offer collection)

**`server/src/socket/chat.ts`:**
- Purpose: All Socket.IO logic in one file; exposes a single `setupSocket(httpServer)` factory
- Authenticates every connection with JWT before the `connection` event fires

## Naming Conventions

**Files:**
- React components: PascalCase, `.tsx` extension — e.g., `RequestCard.tsx`, `AuthContext.tsx`
- Server modules: camelCase, `.ts` extension — e.g., `auth.ts`, `db.ts`, `chat.ts`
- Pages follow the same PascalCase pattern as components — e.g., `BrowseFeed.tsx`, `PostRequest.tsx`

**Directories:**
- Client: lowercase plural noun — `components/`, `contexts/`, `pages/`, `services/`
- Server: lowercase plural noun — `routes/`, `models/`, `middleware/`, `config/`, `socket/`

**TypeScript interfaces:**
- Mongoose Document interfaces: `I` prefix — `IUser`, `IHelpRequest`, `IMessage`, `INotification`
- Client-side plain interfaces: no prefix — `User`, `HelpRequest`, `Message`, `Notification`

**React Contexts:**
- Context type interfaces: `<Name>ContextType` — e.g., `AuthContextType`, `SocketContextType`
- Provider exports: `<Name>Provider` function component
- Hook exports: `use<Name>` function — e.g., `useAuth`, `useSocket`

**API functions in `api.ts`:**
- Named exports using verb + noun camelCase — e.g., `getRequests`, `createRequest`, `submitOffer`, `markAllRead`

## Shared Code, Utilities, and Common Modules

**`client/src/types.ts`** — The only shared-type file on the client. All pages and components import from here. There is no shared types package between client and server; each side maintains its own interface definitions independently.

**`client/src/services/api.ts`** — Shared HTTP layer; used by both Context providers and individual page components. Adding a new endpoint means adding one exported function here.

**`server/src/middleware/auth.ts`** — Shared between all protected route files. Also replicated independently in `server/src/socket/chat.ts` for Socket.IO connections (the logic is duplicated inline, not imported).

**No barrel files (`index.ts`)** are present. Imports go directly to the file containing the export.

## Where Business Logic Lives vs. Presentation vs. Data Access

**Presentation:**
- `client/src/pages/*.tsx` — layout, event handlers, local state
- `client/src/components/*.tsx` — reusable UI atoms and layout pieces

**Client State / Application Logic:**
- `client/src/contexts/AuthContext.tsx` — session management, login/logout/register actions
- `client/src/contexts/SocketContext.tsx` — WebSocket lifecycle tied to auth state
- Individual pages manage their own fetch-on-mount patterns with `useEffect` + `useState`

**HTTP Communication:**
- `client/src/services/api.ts` — all HTTP calls; the boundary between client logic and network

**Server Business Logic:**
- `server/src/routes/*.ts` — inline route handlers contain all business rules (ownership checks, status transitions, notification creation)
- No dedicated service or repository layer exists; Mongoose models are queried directly inside handlers

**Data Access:**
- `server/src/models/*.ts` — Mongoose models define schema, validation, and document methods
- `server/src/config/db.ts` — connection management only

**Real-Time Logic:**
- `server/src/socket/chat.ts` — message persistence + notification creation triggered by socket events

## Where to Add New Code

**New API endpoint:**
- Add handler to the appropriate file in `server/src/routes/` (or create a new route file and mount it in `server/src/server.ts`)
- Add the matching typed function to `client/src/services/api.ts`

**New page / route:**
- Create `client/src/pages/MyPage.tsx`
- Add a `<Route path="/my-path" element={<MyPage />} />` in `client/src/App.tsx`
- Wrap in `<ProtectedRoute>` if authentication is required

**New reusable UI component:**
- Create `client/src/components/MyComponent.tsx`

**New shared client type:**
- Add the interface to `client/src/types.ts`

**New Mongoose model:**
- Create `server/src/models/MyModel.ts` following the `IModel` interface + `mongoose.model()` export pattern
- Import in the route file that needs it

**New socket event:**
- Add `socket.on('eventName', handler)` inside the `io.on('connection', ...)` block in `server/src/socket/chat.ts`

---

*Structure analysis: 2026-04-16*
