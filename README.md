# Real-Time Collaborative Whiteboard (MERN)

Full-stack MERN whiteboard with authentication, real-time collaboration, chat, file sharing, and screen sharing.

## Features
- JWT auth (register/login)
- Create/join rooms with unique IDs
- Real-time drawing with Socket.io
- Pencil/eraser, color picker, brush size
- Undo/redo and clear board
- Chat and online user presence
- File sharing inside room
- Canvas snapshot save (PNG)
- Persistent room state in MongoDB
- Screen sharing using WebRTC signaling over Socket.io
- Responsive layout

## Tech Stack
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT
- **Frontend:** React (Vite), React Router, Socket.io-client

## Project Structure
- `server/` backend API + sockets
- `client/` frontend React app

## Setup

### 1) Backend
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### 2) Frontend
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Environment Variables
### Backend (`server/.env`)
- `PORT=5000`
- `MONGODB_URI=mongodb://127.0.0.1:27017/whiteboard`
- `JWT_SECRET=change_me`
- `CLIENT_ORIGIN=http://localhost:5173`

### Frontend (`client/.env`)
- `VITE_API_URL=http://localhost:5000`

## Notes
- For screen sharing, ensure your browser allows display capture permissions.
- File sharing is limited to 2MB per file.

## Deployment
- Deploy backend (Render/Railway/Heroku) and set environment variables.
- Deploy frontend (Netlify/Vercel) and update `VITE_API_URL`.

