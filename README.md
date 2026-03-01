# Real-Time Collaborative Whiteboard (MERN)

Live:
- Frontend (Vercel): https://capstone-project-1-51yk1m7sw-phoenix-noah0806s-projects.vercel.app
- Backend API (Render): https://capstone-project-1-8q7i.onrender.com

Full-stack MERN whiteboard with auth, real-time collaboration, missions, mini‑games, chat, file sharing, and screen sharing.

## Features
- JWT auth (register/login) with avatar customization
- Create/join rooms via shareable IDs
- Real-time drawing (Socket.io) with pencil/eraser, colors, brush size
- Undo/redo, clear board (host‑guarded), canvas snapshot save (PNG)
- Live cursors, reactions, in-room chat (100‑message cap)
- File sharing (<=2 MB) inside rooms
- Mission engine with scoring, stages, timers, roles, history
  - Modes: free, blind (hidden hints to analysts), puzzle (HexaDrone logo grid pieces), Skribble (draw‑and‑guess mini‑game)
  - Auto XP per stroke; scoreboard + contribution counts; voting events
  - Mission timeout watchdog and completion/fail events
- Screen sharing (WebRTC signaling over Socket.io, host‑only)
- Responsive React/Vite UI

## Tech Stack
- Backend: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, CORS
- Frontend: React (Vite), React Router, Socket.io-client
- Deployment: Render (API), Vercel (UI)

## Project Structure
- `server/` — API + sockets
  - `src/config` DB, `routes` auth/rooms, `sockets` real-time events, `models` (Room/User), `middleware` JWT
- `client/` — React app
  - `src/api`, `components` (incl. `gamify`), `pages`, `context`, `styles`, `public/puzzles`
- `dump/whiteboard` — misc assets
- `node_modules/` folders (root, client, server) — dependencies

## Setup (local)
```bash
# Backend
cd server
npm install
cp .env.example .env   # set PORT, MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN
npm run dev

# Frontend
cd ../client
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:5000
npm run dev
