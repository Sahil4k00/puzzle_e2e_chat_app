# Puzzle Invite E2E Chat

A full-stack one-to-one encrypted chat application built with Next.js, Express, MongoDB, Socket.IO, JWT auth, and client-side hybrid encryption with the Web Crypto API.

## Use it here
https://puzzle-e2e-chat-app.vercel.app

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

### Frontend

Create `frontend/.env.local` from `frontend/.env.example`.

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
- add multi-device key management
- add Redis for Socket.IO pub/sub scaling
- add background jobs and abuse protection
