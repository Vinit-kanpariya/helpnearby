# Codebase Concerns

**Analysis Date:** 2026-04-16

---

## Security Concerns

### Hardcoded JWT Fallback Secret — SEVERITY: HIGH
- Issue: `"fallback_secret"` is used as the JWT signing key when `JWT_SECRET` env var is absent. Any server started without the env var produces tokens signed with a known, public string, making them trivially forgeable.
- Files:
  - `server/src/middleware/auth.ts` line 23
  - `server/src/routes/auth.ts` line 13
  - `server/src/socket/chat.ts` line 23
- Impact: Full authentication bypass — an attacker can craft valid JWTs for any userId if the env var is missing (e.g., in a fresh deploy or misconfigured environment).
- Fix approach: Remove the `|| "fallback_secret"` fallback entirely. Throw a startup error if `JWT_SECRET` is not set (validate all required env vars in `server/src/server.ts` before connecting to DB).

---

### JWT Token Stored in localStorage — SEVERITY: HIGH
- Issue: Auth tokens are persisted to `localStorage` in `client/src/contexts/AuthContext.tsx` and read via `localStorage.getItem("token")` in `client/src/services/api.ts`. `localStorage` is accessible to any JavaScript on the page, making tokens vulnerable to XSS attacks.
- Files:
  - `client/src/contexts/AuthContext.tsx` lines 31, 55, 67, 74
  - `client/src/services/api.ts` line 9
- Impact: XSS attack (via a third-party script or future injection) can steal the auth token and impersonate the user indefinitely (token expires in 30 days).
- Fix approach: Use `httpOnly` cookies for token storage. Refactor the backend to set `Set-Cookie` on login, and the frontend to rely on cookies instead of the Authorization header.

---

### No Rate Limiting on Auth Endpoints — SEVERITY: HIGH
- Issue: `/api/auth/login` and `/api/auth/register` have no rate limiting. Brute-force and credential-stuffing attacks are entirely uninhibited.
- Files: `server/src/routes/auth.ts`, `server/src/server.ts`
- Impact: Passwords can be brute-forced; accounts can be spammed into existence.
- Fix approach: Add `express-rate-limit` middleware, applied globally or specifically to `/api/auth/*` routes.

---

### Socket Messages Not Authenticated by Socket Identity — SEVERITY: HIGH
- Issue: The `sendMessage` socket event trusts `data.sender` from the client payload without verifying it against the authenticated `socket.userId`. A connected user can forge any sender ID.
- Files: `server/src/socket/chat.ts` lines 44–64
- Impact: User A can send messages appearing to be from User B, corrupting chat history and enabling impersonation.
- Fix approach: Replace `data.sender` with `socket.userId` (the server-side verified identity) when creating the `Message` document and emitting events.

---

### Socket `messageRead` Not Authenticated — SEVERITY: HIGH
- Issue: The `messageRead` socket event trusts `data.readBy` from the client and calls `Message.updateMany` with `{ _id: { $in: data.messageIds } }` — no check that the caller is the message receiver.
- Files: `server/src/socket/chat.ts` lines 82–98
- Impact: Any authenticated socket can mark any message as read by supplying arbitrary message IDs.
- Fix approach: Filter the updateMany to only update messages where `receiver === socket.userId`, and ignore the `data.readBy` field from the client.

---

### `PATCH /api/requests/:id/complete` Lacks Authorization Check — SEVERITY: HIGH
- Issue: Any authenticated user can mark any request as "completed", not just the requester.
- Files: `server/src/routes/requests.ts` lines 197–225
- Impact: Any user can prematurely close another user's open request.
- Fix approach: Add `if (request.requester.toString() !== req.userId) { res.status(403)... }` before updating status.

---

### `GET /api/requests` — No Authentication Required — SEVERITY: MEDIUM
- Issue: The public browse feed endpoint at `GET /api/requests` is unauthenticated, which is intentional, but it also accepts arbitrary `category` and `status` query parameters that are passed directly into a MongoDB filter object without sanitization.
- Files: `server/src/routes/requests.ts` lines 10–27
- Impact: An attacker can pass `status[$ne]=active` or other MongoDB operator injection via query params, potentially leaking data across statuses.
- Fix approach: Whitelist allowed values for `category` and `status` query params (e.g., check against the enum lists defined in the model) before building the filter.

---

### `PUT /api/users/profile` — No Input Validation — SEVERITY: MEDIUM
- Issue: The profile update endpoint accepts arbitrary fields (`name`, `phone`, `bio`, `location`, `avatar`) with no server-side validation. In particular, `avatar` accepts any string (could be a javascript: URL or external tracking pixel URL).
- Files: `server/src/routes/users.ts` lines 25–46
- Impact: No length limits on bio/name, no URL validation on avatar. Minor injection risk.
- Fix approach: Add `express-validator` checks on this route, mirroring the pattern used in `server/src/routes/auth.ts`.

---

### Google OAuth Random Password Generation — SEVERITY: LOW
- Issue: Google-only accounts receive a randomly generated password using `Math.random()`, which is not cryptographically secure.
- Files: `server/src/routes/auth.ts` line 147
- Impact: In practice the password is hashed and never exposed, but `Math.random()` is not CSPRNG-quality.
- Fix approach: Use `crypto.randomBytes(32).toString('hex')` instead.

---

### `GOOGLE_CLIENT_ID` Missing from `.env.example` — SEVERITY: LOW
- Issue: The `.env.example` file is missing `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`, which are required for Google OAuth to work.
- Files: `.env.example`
- Impact: New developers will not know these vars are required, leading to silent Google Sign-In failures.
- Fix approach: Add all required env vars to `.env.example` with descriptive placeholder values.

---

## Technical Debt

### `as any` Type Casts in Server Code — SEVERITY: MEDIUM
- Issue: Multiple `as any` casts are used to work around TypeScript's type system, primarily to pass `req.userId` (a `string | undefined`) into Mongoose queries expecting `ObjectId`.
- Files:
  - `server/src/routes/chat.ts` lines 19, 20, 29, 40
  - `server/src/routes/requests.ts` line 126
  - `server/src/socket/chat.ts` line 25
- Impact: Loss of type safety around user identity; hides potential undefined-userId bugs.
- Fix approach: Extend the `AuthRequest` interface to ensure `userId` is always a string after auth middleware runs (or use a separate route handler type). Use `new mongoose.Types.ObjectId(req.userId)` for explicit conversion.

---

### `30d` JWT Expiry — No Refresh Token Strategy — SEVERITY: MEDIUM
- Issue: JWTs expire after 30 days (`server/src/routes/auth.ts` line 13–15). There is no refresh token mechanism. Users stay logged in with the same long-lived token, and there is no way to revoke a token short of changing `JWT_SECRET` (which logs out everyone).
- Files: `server/src/routes/auth.ts`
- Impact: Compromised tokens are valid for up to 30 days with no revocation path.
- Fix approach: Implement short-lived access tokens (15 min) plus `httpOnly` cookie-based refresh tokens stored in a `sessions` collection for revocability.

---

### Password Change UI Has No Backend Endpoint — SEVERITY: HIGH
- Issue: The "Change Password" form in Settings is fully rendered with Current/New/Confirm fields and an "Update Password" button, but clicking the button does nothing — there is no API call and no corresponding server route.
- Files:
  - `client/src/pages/Settings.tsx` lines 314–381
  - `server/src/routes/auth.ts` (missing route)
  - `server/src/routes/users.ts` (missing route)
- Impact: Users believe they are changing their password but nothing happens. This is a trust-breaking broken feature.
- Fix approach: Add `PUT /api/users/password` route on the server that verifies the current password with `comparePassword`, then updates. Wire the Settings component to call this endpoint.

---

### "Delete Account" Button Has No Implementation — SEVERITY: HIGH
- Issue: The "Delete Account" button in Settings is rendered but has no `onClick` handler. It is a dead UI element.
- Files: `client/src/pages/Settings.tsx` line 392
- Impact: Users in the "Danger Zone" section expect account deletion to work.
- Fix approach: Implement `DELETE /api/users/me` on the server (cascade-delete user's requests, messages, notifications), and add a confirmation dialog before calling it from the frontend.

---

### Notification Preferences Are Not Persisted — SEVERITY: MEDIUM
- Issue: The Notification Preferences tab in Settings manages `prefs` state locally (`useState`) with no API call to save or load the user's preferences.
- Files: `client/src/pages/Settings.tsx` lines 39–44, 237–298
- Impact: Toggle changes are lost on page refresh. The feature is entirely cosmetic.
- Fix approach: Add a `notificationPrefs` field to the `User` model, and call `updateProfile` when the user toggles a preference.

---

### Avatar Upload Not Implemented — SEVERITY: MEDIUM
- Issue: The "Change Photo" button in Settings (`client/src/pages/Settings.tsx` line 142) has no `onClick` handler. User profile photos (`avatar`) can only be set via Google OAuth (profile picture URL). No file upload or URL-input path exists for email/password users.
- Files: `client/src/pages/Settings.tsx` line 142, `server/src/routes/users.ts`
- Impact: Email-registered users permanently have a placeholder avatar.
- Fix approach: Add a file upload input (with multer on the server, or client-side upload to a CDN like Cloudinary), and wire the "Change Photo" button to it.

---

### Map Placeholder Never Replaced — SEVERITY: MEDIUM
- Issue: The map area on `RequestDetail` is a static placeholder div with a `MapPin` icon and the address text. There is no actual map integration despite coordinates being stored.
- Files: `client/src/pages/RequestDetail.tsx` lines 238–246
- Impact: A core UX feature (seeing where help is needed geographically) is missing. The location model (`coordinates: [number, number]`) and geocoding infrastructure exist but go unused for display.
- Fix approach: Integrate Leaflet (free/OSM) or Google Maps using the stored `coordinates` to render an actual map tile.

---

### Rating System Not Implemented — SEVERITY: MEDIUM
- Issue: `User.rating` and `User.tasksHelped` fields exist in the data model and are displayed in the UI, but there is no endpoint to submit a rating, and no logic to update these fields after a task is completed.
- Files:
  - `server/src/models/User.ts` lines 12–13, 33–35
  - `server/src/models/Notification.ts` (has `"rating"` enum but no route creates it)
  - `client/src/pages/Profile.tsx` line 79
- Impact: Rating always shows `0.0`. Trust and quality signals are absent.
- Fix approach: Add `POST /api/requests/:id/rate` that updates `helper.rating` and `helper.tasksHelped` on completion.

---

### Conversation Search Bar Is Non-Functional — SEVERITY: LOW
- Issue: The chat sidebar includes a "Search conversations..." input that has no `onChange` handler or filtering logic.
- Files: `client/src/pages/Chat.tsx` lines 123–128
- Impact: Users expect search to filter conversations; it does nothing.
- Fix approach: Add local state filtering on `conversations` by `conv.user.name` as the user types.

---

## Performance Concerns

### N+1 Query in Chat Conversations Endpoint — SEVERITY: HIGH
- Issue: `GET /api/chat/conversations` runs an aggregation to get distinct conversation partners, then calls `User.findById()` inside `Promise.all(messages.map(...))` — one DB query per conversation.
- Files: `server/src/routes/chat.ts` lines 52–65
- Impact: A user with 50 conversations triggers 51 MongoDB round-trips per page load. This will degrade noticeably under any real load.
- Fix approach: Replace the per-iteration `findById` with a `$lookup` stage inside the aggregation pipeline, or at minimum batch with `User.find({ _id: { $in: userIds } })`.

---

### All Requests Loaded on Browse Page — SEVERITY: MEDIUM
- Issue: `BrowseFeed.tsx` fetches all active requests AND all completed requests simultaneously on mount. Completed requests are not paginated. The server caps active requests at 50 (`limit(50)`) but completed requests in `GET /api/requests?status=completed` have the same 50 cap.
- Files:
  - `client/src/pages/BrowseFeed.tsx` lines 114–126
  - `server/src/routes/requests.ts` lines 17–22
- Impact: Page load fetches up to 100 request documents on every visit. Distance filtering is done client-side in JavaScript after loading everything, meaning irrelevant data is always transferred.
- Fix approach: Move distance filtering to the server using MongoDB's `$geoNear` aggregation (requires a `2dsphere` index on `HelpRequest.location`). Add cursor-based or offset pagination.

---

### No Database Indexes Defined — SEVERITY: MEDIUM
- Issue: No Mongoose schema defines explicit indexes. MongoDB will only use the default `_id` index. Common queries (by `status`, by `requester`, by `offers.user`, by `user` on Notification/Message) will perform full collection scans as data grows.
- Files:
  - `server/src/models/HelpRequest.ts`
  - `server/src/models/Message.ts`
  - `server/src/models/Notification.ts`
  - `server/src/models/User.ts`
- Impact: Query time degrades linearly with collection size. This is the most common first-scaling failure point for MongoDB apps.
- Fix approach: Add `helpRequestSchema.index({ status: 1, createdAt: -1 })`, `helpRequestSchema.index({ requester: 1 })`, `helpRequestSchema.index({ location: '2dsphere' })`, `messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 })`, `notificationSchema.index({ user: 1, read: 1, createdAt: -1 })`.

---

### Client-Side Distance Filtering Breaks on Zero Coordinates — SEVERITY: MEDIUM
- Issue: Requests with `coordinates: [0, 0]` (the default fallback) are always included in distance-filtered results with the comment `// skip posts with no coords`. This means requests with no valid location always appear regardless of the selected distance filter.
- Files: `client/src/pages/BrowseFeed.tsx` line 137
- Impact: Users in distance-filter mode see geographically irrelevant results mixed in.
- Fix approach: Either require valid coordinates on submission (enforce on the backend), or show these "unlocated" requests in a separate section with a clear label.

---

### Nominatim API Called Without User-Agent Header — SEVERITY: LOW
- Issue: Nominatim (OpenStreetMap geocoding) is called from both `PostRequest.tsx` and `BrowseFeed.tsx` via bare `fetch()` calls with no `User-Agent` header. Nominatim's usage policy requires a descriptive User-Agent.
- Files:
  - `client/src/pages/PostRequest.tsx` lines 54–57, 93–98
  - `client/src/pages/BrowseFeed.tsx` lines 84–88, 57–60
  - `client/src/pages/Settings.tsx` lines 83–90
- Impact: Nominatim may throttle or block requests from the app. This is also a ToS violation.
- Fix approach: Proxy Nominatim calls through the Express server (adds a `User-Agent`) or add the header to fetch calls.

---

## Missing Error Handling

### Silent Failures in Profile Page — SEVERITY: MEDIUM
- Issue: All three API calls in `Profile.tsx` (`getMe`, `getMyPostedRequests`, `getMyOffers`) swallow errors with empty `.catch(() => {})` blocks. Users see no feedback if data fails to load.
- Files: `client/src/pages/Profile.tsx` lines 17–31
- Fix approach: Add error state and surface a user-visible error message or retry button.

---

### `RequestDetail` Fetch Errors Silently Dropped — SEVERITY: MEDIUM
- Issue: The `getRequest(id)` call in `RequestDetail.tsx` has no `.catch()` — an API error leaves the spinner running indefinitely until the component unmounts.
- Files: `client/src/pages/RequestDetail.tsx` line 21
- Fix approach: Add `.catch(() => setLoading(false))` and set an error state for display.

---

### Socket `sendMessage` Error Not Surfaced to User — SEVERITY: MEDIUM
- Issue: When a `sendMessage` socket event fails on the server, the error is logged but the optimistic UI update (message prepended to the list) is never rolled back. The user sees a "sent" message that was never persisted.
- Files:
  - `server/src/socket/chat.ts` lines 64–66
  - `client/src/pages/Chat.tsx` lines 84–96
- Fix approach: Emit an error acknowledgment from the server on failure; on the client, listen for it and remove the optimistically added message (or mark it as failed).

---

### Chat Initial Conversation Load Errors Are Silent — SEVERITY: LOW
- Issue: The `getPublicProfile` call inside the Chat `useEffect` silently catches errors with `catch { /* ignore */ }`.
- Files: `client/src/pages/Chat.tsx` line 47
- Fix approach: Show a toast or inline message if a user profile can't be loaded when opening a chat from a URL parameter.

---

### Server Route Errors Use Generic "Server error" — SEVERITY: LOW
- Issue: Every `catch` block across all server routes returns `res.status(500).json({ message: "Server error" })` with no distinction between validation errors, not-found cases, and genuine internal faults. In routes/requests.ts, some catch blocks don't even log the error.
- Files:
  - `server/src/routes/requests.ts` (multiple catch blocks with no `console.error`)
  - `server/src/routes/notifications.ts`
  - `server/src/routes/users.ts`
  - `server/src/routes/chat.ts`
- Fix approach: At minimum, log the error in every catch block. Consider a centralized Express error handler middleware to standardize error responses.

---

## Scalability Concerns

### Socket.io with No Horizontal Scaling Strategy — SEVERITY: MEDIUM
- Issue: `setupSocket` in `server/src/socket/chat.ts` creates a plain `Server` with in-process room management. Adding a second server process will break socket rooms — users on different processes won't receive messages.
- Files: `server/src/socket/chat.ts`
- Impact: The app cannot scale beyond a single Node.js process.
- Fix approach: Add `@socket.io/redis-adapter` with a Redis instance for multi-process pub/sub.

---

### No Pagination on Any Endpoint — SEVERITY: MEDIUM
- Issue: All list endpoints return at most 50 records with a hard `.limit(50)` or `.limit(100)`, with no cursor or offset pagination exposed to the client. There is no way to load older messages, more requests, or more notifications.
- Files:
  - `server/src/routes/requests.ts` line 21
  - `server/src/routes/chat.ts` line 86
  - `server/src/routes/notifications.ts` line 14
- Impact: Data older than the cap is inaccessible. Chat history truncates at 100 messages.
- Fix approach: Add `skip`/`limit` or cursor-based pagination query params to all list endpoints.

---

### MongoDB Connection Has No Reconnect Strategy — SEVERITY: LOW
- Issue: `server/src/config/db.ts` calls `mongoose.connect()` once and calls `process.exit(1)` on failure. If MongoDB becomes temporarily unavailable after startup, Mongoose will handle reconnection internally, but there is no monitoring, alerting, or graceful degradation.
- Files: `server/src/config/db.ts`
- Impact: Transient DB outages may crash the server process silently.
- Fix approach: Add Mongoose connection event listeners (`mongoose.connection.on('disconnected', ...)`) and integrate with a process manager (PM2) or container restart policy.

---

## Inconsistencies

### Dual Data-Fetching Pattern for Response Shape — SEVERITY: LOW
- Issue: Throughout client pages, API responses are read with `res.data.requests || res.data || []` and `res.data.user || res.data`. This suggests the API response shape was changed at some point and backward-compat shims were added. The actual API consistently wraps responses (e.g., `{ requests }`, `{ user }`), but the fallback adds noise.
- Files:
  - `client/src/pages/BrowseFeed.tsx` lines 121–122
  - `client/src/pages/Profile.tsx` lines 19, 26, 30
  - `client/src/pages/Chat.tsx` lines 25–26, 56
- Fix approach: Standardize all API response shapes and remove `|| res.data` fallbacks. Document the shape convention in a shared type or API layer.

---

### `User.requestsPosted` Counter Never Updated — SEVERITY: MEDIUM
- Issue: `User.requestsPosted` exists on the schema and is shown in the Profile stats, but no server route increments it when a request is created.
- Files:
  - `server/src/models/User.ts` line 35
  - `server/src/routes/requests.ts` lines 63–85
  - `client/src/pages/Profile.tsx` line 79 (falls back to `posted.length` — hides the bug)
- Impact: The stat will always show 0 from the schema default, while the frontend workaround (`?? posted.length`) masks the issue.
- Fix approach: After `HelpRequest.create(...)` in the POST route, call `User.findByIdAndUpdate(req.userId, { $inc: { requestsPosted: 1 } })`.

---

### `HelpRequest.date` and `HelpRequest.time` Are Plain Strings — SEVERITY: LOW
- Issue: The schema stores date/time as raw strings rather than a combined `Date` field. This makes date arithmetic, sorting by scheduled time, and timezone handling impossible without additional parsing.
- Files: `server/src/models/HelpRequest.ts` lines 9–10, 40–41
- Impact: Cannot sort requests by scheduled time or filter for "upcoming" requests.
- Fix approach: Combine into a single `scheduledAt: Date` field, or at least validate/parse the strings in the schema.

---

### `BrowseFeed` Distance Filter Shown Without User Location Warning — SEVERITY: LOW
- Issue: Distance filter radio buttons are active and selected by default ("Within 1km"), but when no location is detected (GPS denied or unavailable), distance filtering is silently disabled via `if (userCoords)`. The UI gives no indication the filter is inactive.
- Files: `client/src/pages/BrowseFeed.tsx` lines 131–138, 220–241
- Fix approach: Grey out/disable distance filter options and show a message ("Enable location to filter by distance") when `userCoords` is null.

---

## Quick Wins

1. **Remove `fallback_secret`** in `server/src/middleware/auth.ts`, `server/src/routes/auth.ts`, and `server/src/socket/chat.ts` — 3 one-line fixes that eliminate a critical security hole. SEVERITY: HIGH.

2. **Add authorization to `PATCH /api/requests/:id/complete`** — 3 lines added to `server/src/routes/requests.ts` to prevent any user from closing any request. SEVERITY: HIGH.

3. **Fix `sendMessage` to use `socket.userId` as sender** — 1 line change in `server/src/socket/chat.ts` eliminates sender forgery. SEVERITY: HIGH.

4. **Add `express-rate-limit`** to auth routes — ~10 lines in `server/src/server.ts` or `server/src/routes/auth.ts`. SEVERITY: HIGH.

5. **Add database indexes** — ~10 lines across the four model files. Compound indexes on status+createdAt, requester, sender+receiver. Zero-risk improvement with major query performance benefit. SEVERITY: MEDIUM.

6. **Increment `requestsPosted` counter** on create — 1 additional DB call in `server/src/routes/requests.ts` after `HelpRequest.create`. SEVERITY: MEDIUM.

7. **Wire `messageRead` to `socket.userId`** — Remove trust of client-provided `readBy`, filter updateMany by `receiver: socket.userId`. SEVERITY: HIGH.

8. **Add `GOOGLE_CLIENT_ID` to `.env.example`** — 1-line addition. SEVERITY: LOW, high developer experience value.

9. **Add error logging to all server route catch blocks** — `console.error` one-liners in `server/src/routes/requests.ts`, `server/src/routes/notifications.ts`, `server/src/routes/users.ts`, `server/src/routes/chat.ts`. SEVERITY: LOW.

10. **Fix Nominatim User-Agent** — Add `headers: { 'User-Agent': 'HelpNearby/1.0' }` to all Nominatim `fetch()` calls in `client/src/pages/PostRequest.tsx`, `client/src/pages/BrowseFeed.tsx`, and `client/src/pages/Settings.tsx`. SEVERITY: LOW, ToS compliance.

---

## Bigger Architectural Concerns

### No Testing Infrastructure Whatsoever — SEVERITY: HIGH
- Issue: There are zero test files in the entire codebase. No test runner is configured for either the client or server. No `*.test.ts`, `*.spec.ts`, or test configuration files exist.
- Impact: Every code change is a manual regression risk. Critical security paths (auth, offer acceptance, completion) are entirely untested.
- Fix approach: Add Vitest for the client and Jest + Supertest for the server as a first phase. Prioritize test coverage for auth middleware, socket auth, and the offer/complete flow.

---

### No Input Sanitization Against XSS in Stored Content — SEVERITY: MEDIUM
- Issue: `HelpRequest.title`, `HelpRequest.description`, `Message.content`, and `User.bio` accept arbitrary strings with no HTML sanitization. React's JSX escapes strings by default, but if these values are ever rendered as `dangerouslySetInnerHTML`, or displayed in notifications/emails outside React, they become XSS vectors.
- Files:
  - `server/src/routes/requests.ts` (POST body passed directly)
  - `server/src/models/HelpRequest.ts`
  - `server/src/models/Message.ts`
- Fix approach: Add a sanitization step (e.g., `DOMPurify` server-side or a simple strip-tags pass) before persisting user-supplied string content.

---

### No Production Build Configuration — SEVERITY: MEDIUM
- Issue: There is no production deployment configuration. The server has `npm run build` (TypeScript compile) and `npm run start` scripts, but there is no process manager config (PM2, Docker, systemd), no environment separation, and no static file serving strategy.
- Impact: Deployment is entirely manual and undocumented. The Vite dev proxy in `client/vite.config.ts` is not present in production builds.
- Fix approach: Add a `Dockerfile` or PM2 `ecosystem.config.js`. Configure Express to serve the Vite build output as static files in production, or document the deployment architecture clearly.

---

### `any` Type on `err` in Client Error Handlers — SEVERITY: LOW
- Issue: Several client catch blocks use `catch (err: any)` to access `err.response?.data?.message`, bypassing TypeScript's strict error typing.
- Files:
  - `client/src/pages/Login.tsx` line 46
  - `client/src/pages/PostRequest.tsx` line 110 (uses a cast workaround)
- Fix approach: Use a typed error guard helper: `function isAxiosError(e: unknown): e is AxiosError`. This is a minor quality improvement but establishes a correct pattern.

---

*Concerns audit: 2026-04-16*
