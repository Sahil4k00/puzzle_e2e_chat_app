import dotenv from "dotenv";
import { Server } from "socket.io";

import ChatRoom from "../models/ChatRoom.js";
import User from "../models/User.js";
import { createEncryptedMessage, saveKeyEnvelope } from "../services/roomService.js";
import { verifyToken } from "../utils/jwt.js";

dotenv.config();

let io;
const userConnectionCounts = new Map();

function incrementConnection(userId) {
  const nextCount = (userConnectionCounts.get(userId) || 0) + 1;
  userConnectionCounts.set(userId, nextCount);
  return nextCount;
}

function decrementConnection(userId) {
  const nextCount = Math.max((userConnectionCounts.get(userId) || 1) - 1, 0);

  if (nextCount === 0) {
    userConnectionCounts.delete(userId);
  } else {
    userConnectionCounts.set(userId, nextCount);
  }

  return nextCount;
}

function isOnline(userId) {
  return (userConnectionCounts.get(userId) || 0) > 0;
}

function emitToUser(userId, event, payload) {
  io.to(`user:${userId}`).emit(event, payload);
}

function emitStatusToParticipants(participants, roomId, userId, online) {
  participants.forEach((participant) => {
    emitToUser(participant._id.toString(), "user_status", {
      roomId,
      userId,
      isOnline: online,
      lastSeenAt: new Date().toISOString()
    });
  });
}

export async function emitMessageToRoomParticipants(roomId, message) {
  if (!io) {
    return;
  }

  const room = await ChatRoom.findOne({ roomId }).populate("participants", "_id");

  if (!room) {
    return;
  }

  room.participants.forEach((participant) => {
    emitToUser(participant._id.toString(), "receive_message", message);
  });
}

async function authorizeRoomAccess(roomId, userId) {
  const room = await ChatRoom.findOne({ roomId }).populate(
    "participants",
    "displayName email publicKey lastSeenAt"
  );

  if (!room) {
    throw new Error("Room not found");
  }

  const allowed = room.participants.some(
    (participant) => participant._id.toString() === userId.toString()
  );

  if (!allowed) {
    throw new Error("Room access denied");
  }

  return room;
}

export function initializeSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const payload = verifyToken(token);
      socket.userId = payload.sub;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", async (socket) => {
    incrementConnection(socket.userId);
    socket.join(`user:${socket.userId}`);
    await User.findByIdAndUpdate(socket.userId, { lastSeenAt: new Date() });

    socket.on("join_room", async ({ roomId }, callback = () => {}) => {
      try {
        const room = await authorizeRoomAccess(roomId, socket.userId);
        socket.join(roomId);

        const participantStatuses = room.participants.map((participant) => ({
          userId: participant._id.toString(),
          isOnline: isOnline(participant._id.toString()),
          lastSeenAt: participant.lastSeenAt
        }));

        callback({
          ok: true,
          roomId,
          participants: room.participants.map((participant) => ({
            id: participant._id.toString(),
            displayName: participant.displayName,
            email: participant.email,
            publicKey: participant.publicKey
          })),
          statuses: participantStatuses
        });

        emitStatusToParticipants(room.participants, roomId, socket.userId, true);
      } catch (error) {
        callback({
          ok: false,
          error: error.message
        });
      }
    });

    socket.on("typing", async ({ roomId, isTyping }) => {
      try {
        const room = await authorizeRoomAccess(roomId, socket.userId);

        room.participants.forEach((participant) => {
          const participantId = participant._id.toString();

          if (participantId !== socket.userId) {
            emitToUser(participantId, "typing", {
              roomId,
              userId: socket.userId,
              isTyping: Boolean(isTyping)
            });
          }
        });
      } catch (_error) {
      }
    });

    socket.on("send_message", async (payload, callback = () => {}) => {
      try {
        const room = await authorizeRoomAccess(payload.roomId, socket.userId);
        socket.join(payload.roomId);

        const message = await createEncryptedMessage({
          roomId: payload.roomId,
          senderId: socket.userId,
          encryptedContent: payload.encryptedContent,
          iv: payload.iv,
          algorithm: payload.algorithm || "AES-GCM",
          messageType: payload.messageType || "text",
          attachment: payload.attachment || null
        });

        room.participants.forEach((participant) => {
          emitToUser(participant._id.toString(), "receive_message", message);
        });

        callback({ ok: true, message });
      } catch (error) {
        callback({ ok: false, error: error.message });
      }
    });

    socket.on("request_key_exchange", async ({ roomId, targetUserId }, callback = () => {}) => {
      try {
        const room = await authorizeRoomAccess(roomId, socket.userId);
        const requester = await User.findById(socket.userId).select("publicKey displayName");

        if (!requester) {
          throw new Error("Requester not found");
        }

        const target = room.participants.find(
          (participant) => participant._id.toString() === targetUserId.toString()
        );

        if (!target) {
          throw new Error("Target user is not in this room");
        }

        emitToUser(targetUserId, "key_exchange_requested", {
          roomId,
          requesterId: socket.userId,
          targetUserId,
          requesterPublicKey: requester.publicKey,
          requesterDisplayName: requester.displayName
        });

        callback({ ok: true });
      } catch (error) {
        callback({ ok: false, error: error.message });
      }
    });

    socket.on(
      "share_session_key",
      async ({ roomId, targetUserId, encryptedSessionKey, algorithm }, callback = () => {}) => {
        try {
          await authorizeRoomAccess(roomId, socket.userId);
          await saveKeyEnvelope({
            roomId,
            currentUserId: socket.userId,
            targetUserId,
            encryptedSessionKey,
            algorithm: algorithm || "RSA-OAEP"
          });

          emitToUser(targetUserId, "session_key_shared", {
            roomId,
            targetUserId,
            sharedBy: socket.userId,
            encryptedSessionKey,
            algorithm: algorithm || "RSA-OAEP"
          });

          callback({ ok: true });
        } catch (error) {
          callback({ ok: false, error: error.message });
        }
      }
    );

    socket.on("disconnect", async () => {
      const remainingConnections = decrementConnection(socket.userId);
      await User.findByIdAndUpdate(socket.userId, { lastSeenAt: new Date() });

      if (remainingConnections === 0) {
        const rooms = await ChatRoom.find({ participants: socket.userId }).populate(
          "participants",
          "displayName email publicKey lastSeenAt"
        );

        rooms.forEach((room) => {
          emitStatusToParticipants(room.participants, room.roomId, socket.userId, false);
        });
      }
    });
  });

  return io;
}

export function getSocketServer() {
  return io;
}
