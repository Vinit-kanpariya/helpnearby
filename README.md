# HelpNearby

A community help marketplace where users post requests (moving, groceries, tutoring, etc.), others submit offers to help, and requesters accept or reject. Includes real-time chat and notifications.

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Node.js, Express 4, TypeScript          |
| Database | MongoDB (Mongoose)                      |
| Realtime | Socket.IO                               |
| Auth     | JWT, Google OAuth2                      |

## Project Structure

```
helpnearby/
├── client/          # React SPA (Vite)
│   └── src/
│       ├── pages/       # Full-page components
│       ├── components/  # Reusable UI components
│       ├── contexts/    # AuthContext, SocketContext
│       ├── services/    # Axios API client
│       └── types.ts     # Shared TypeScript interfaces
├── server/          # Express REST API + Socket.IO
│   └── src/
│       ├── routes/      # auth, requests, users, notifications, chat
│       ├── models/      # User, HelpRequest, Message, Notification
│       ├── middleware/  # JWT auth middleware
│       └── socket/      # Socket.IO event handlers
└── package.json     # Root scripts (concurrently)
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Cloud OAuth2 credentials (optional, for Google login)

### 1. Clone the repository

```bash
git clone <repo-url>
cd helpnearby
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
NGROK_TOKEN=your_ngrok_token   # optional, for tunneling
```

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Start the development environment

```bash
npm run dev
```

- Client: [http://localhost:5173](http://localhost:5173)
- Server: [http://localhost:5000](http://localhost:5000)

## Available Scripts

| Command              | Description                              |
|----------------------|------------------------------------------|
| `npm run dev`        | Start both server and client             |
| `npm run dev:server` | Start server only (hot-reload via nodemon) |
| `npm run dev:client` | Start client only (Vite dev server)      |
| `npm run install:all`| Install all dependencies (root + server + client) |
| `npm run build`      | Build client for production              |
| `npm run tunnel`     | Start ngrok tunnel                       |

## Features

- Browse and filter help requests by location, distance, and reward type
- Post help requests with location, time, and reward (cash / food / free)
- Submit offers on others' requests; requester accepts or rejects
- Real-time chat between requester and helper via Socket.IO
- In-app notifications for offers, acceptances, and messages
- JWT-based auth with Google OAuth2 sign-in support
