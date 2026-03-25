# Puzzle Invite E2E Chat

A full-stack one-to-one encrypted chat application built with Next.js, Express, MongoDB, Socket.IO, JWT auth, and client-side hybrid encryption with the Web Crypto API.

## Overview

This project lets users:

- Sign up and log in with email/password
- Create private one-to-one chat invites
- Attach a puzzle challenge to an invite
- Let the invitee solve the puzzle under a timer
- Show a fun success or failure banner
- Continue into chat either way
- Exchange encrypted text messages in real time
- Send encrypted images, videos, audio, and files

The server never sees plaintext chat content.

## Current feature set

- Email auth with bcrypt password hashing
- JWT-based authenticated API access
- Puzzle-based invite system with countdown timer
- Success/failure banner before chat access
- One-to-one chat rooms
- Realtime messaging with Socket.IO
- Typing indicator
- Online/offline presence
- Encrypted message persistence in MongoDB
- Encrypted attachment support:
  - images
  - videos
  - audio
  - generic files
- Dark blue UI theme only

## Tech stack

### Frontend

- Next.js
- React
- Tailwind CSS
- Socket.IO client
- Web Crypto API

### Backend

- Node.js
- Express
- Socket.IO
- Mongoose

### Database and storage

- MongoDB
- Local encrypted attachment storage in `backend/uploads/`

## Project structure

```text
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    sockets/
    utils/
  uploads/

frontend/
  components/
  hooks/
  pages/
  styles/
  utils/
```

## Environment variables

### Backend

Create `backend/.env` from `backend/.env.example`.

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/puzzle-chat
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:3000
APP_URL=http://localhost:3000
```

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Local setup

1. Make sure MongoDB is running locally or use MongoDB Atlas.
2. Create:
   - `backend/.env`
   - `frontend/.env.local`
3. Install backend dependencies:

```powershell
cd backend
npm install
```

4. Install frontend dependencies:

```powershell
cd frontend
npm install
```

5. Start the backend:

```powershell
cd backend
npm run dev
```

6. Start the frontend:

```powershell
cd frontend
npm run dev
```

7. Open:

```text
http://localhost:3000
```

## How encryption works

### Identity keys

1. On signup or login, the browser generates or reuses an RSA-OAEP keypair.
2. The public key is sent to the backend and stored with the user.
3. The private key stays on the client.

### Room key exchange

1. The room creator generates an AES-GCM room session key.
2. The room key is encrypted with the creator's public key and stored as an encrypted envelope.
3. When the second participant joins, the creator encrypts the same room key with the invitee's public key.
4. The backend relays only encrypted room-key envelopes.

### Text messages

1. Text is encrypted in the browser with AES-GCM.
2. The server stores only:
   - ciphertext
   - IV
   - algorithm
   - sender
   - timestamp

### Attachments

1. Files are encrypted in the browser with the same AES-GCM room key.
2. The encrypted blob is uploaded to the backend.
3. The backend stores only the encrypted file and attachment metadata.
4. The recipient downloads the encrypted blob and decrypts it locally.

## Data model

### Users

- email
- displayName
- passwordHash
- publicKey
- lastSeenAt

### Chat rooms

- roomId
- createdBy
- participants
- keyEnvelopes

### Invites

- code
- roomId
- createdBy
- puzzleQuestion
- answerHash
- timeLimitSeconds
- expiresAt

### Messages

- roomId
- sender
- messageType
- encryptedContent
- iv
- algorithm
- attachment metadata
- timestamps

## API summary

### REST APIs

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/invites`
- `GET /api/invites/:code/public`
- `POST /api/invites/:code/validate`
- `GET /api/rooms`
- `GET /api/rooms/:roomId`
- `POST /api/rooms/:roomId/key-envelope`
- `POST /api/rooms/:roomId/attachments`

### Socket events

- `join_room`
- `send_message`
- `receive_message`
- `typing`
- `user_status`
- `request_key_exchange`
- `key_exchange_requested`
- `share_session_key`
- `session_key_shared`

## Attachment support

Supported attachment categories:

- image
- video
- audio
- file

Current attachment limit:

- `10 MB` per file

Stored location in local/self-hosted backend:

- `backend/uploads/`

Important:

- these stored files are encrypted blobs, not plaintext media
- for production on Render, use a persistent disk for uploads

## Sample local test flow

1. Open two separate browser profiles.
2. Create User A in profile 1.
3. Create User B in profile 2.
4. Log in as both users.
5. From User A, create an invite with a puzzle.
6. Open the invite link in User B's profile.
7. Solve or fail the puzzle.
8. Open the chat from both sides.
9. Test:
   - presence
   - typing
   - text message delivery
   - image/file/audio/video sending
10. Inspect MongoDB and verify messages are stored encrypted.

## Deployment recommendation

Best deployment split for the current architecture:

- Frontend: Vercel
- Backend: Render Web Service
- Database: MongoDB Atlas

Why:

- Next.js is easiest on Vercel
- Express + Socket.IO works well as a long-running service on Render
- MongoDB Atlas is a natural hosted MongoDB choice
- attachment uploads need persistent storage, which Render supports with disks

## Deploy on MongoDB Atlas

1. Create an Atlas cluster.
2. Create a database user.
3. Add your app/network access.
4. Copy the connection string.
5. Set `MONGODB_URI` in Render.

Example:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/puzzle-chat?retryWrites=true&w=majority
```

## Deploy backend on Render

Create a Render Web Service from the GitHub repo.

Recommended settings:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Environment variables:

```env
PORT=10000
MONGODB_URI=your-atlas-connection-string
JWT_SECRET=your-long-random-secret
CLIENT_URL=https://your-frontend-project.vercel.app
APP_URL=https://your-frontend-project.vercel.app
```

Add a persistent disk:

- Mount path: `/opt/render/project/src/uploads`

## Deploy frontend on Vercel

Create a Vercel project from the same repo.

Recommended settings:

- Framework: Next.js
- Root Directory: `frontend`

Environment variables:

```env
NEXT_PUBLIC_APP_URL=https://your-frontend-project.vercel.app
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
```

After Vercel gives you the real production URL, update Render:

```env
CLIENT_URL=https://your-frontend-project.vercel.app
APP_URL=https://your-frontend-project.vercel.app
```

Then redeploy the backend.

## Security notes

- Passwords are hashed with bcrypt
- Puzzle answers are hashed before storage
- Messages are stored encrypted only
- Attachments are uploaded encrypted only
- Private RSA keys stay on the client
- AES-GCM uses a fresh IV per message/file
- The server handles encrypted envelopes and encrypted payloads, not plaintext chat

For stronger production security, consider:

- moving private-key storage from localStorage to IndexedDB or hardware-backed credentials
- tightening CORS for preview and production domains
- virus scanning for uploaded encrypted blobs if your platform requires it
- rate limiting and stronger validation
- HTTPS-only deployment

## Known MVP limitations

- one-to-one rooms only
- private keys are stored locally in the browser for simplicity
- if the room creator is offline on a fresh device, the second user may need the creator online once to receive the AES room key
- attachments are stored on local disk or Render disk, not object storage

## Suggested production improvements

- move encrypted attachments to S3, Cloudflare R2, or similar object storage
- add message delivery/read receipts
- add invite expiration controls in the UI
- add multi-device key management
- add Redis for Socket.IO pub/sub scaling
- add background jobs and abuse protection
