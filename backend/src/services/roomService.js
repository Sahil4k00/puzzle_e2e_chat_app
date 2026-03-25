import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import { createHttpError } from "../utils/httpError.js";
import { requirePositiveInteger, requireString } from "../utils/validators.js";

function serializeParticipant(participant) {
  return {
    id: participant._id.toString(),
    email: participant.email,
    displayName: participant.displayName,
    publicKey: participant.publicKey,
    lastSeenAt: participant.lastSeenAt
  };
}

function serializeRoom(room, currentUserId, latestMessage = null) {
  const currentEnvelope = room.keyEnvelopes.find(
    (entry) => entry.user.toString() === currentUserId.toString()
  );

  return {
    roomId: room.roomId,
    createdBy: room.createdBy?._id
      ? {
          id: room.createdBy._id.toString(),
          displayName: room.createdBy.displayName,
          email: room.createdBy.email,
          publicKey: room.createdBy.publicKey
        }
      : null,
    participants: room.participants.map(serializeParticipant),
    currentUserKeyEnvelope: currentEnvelope
      ? {
          encryptedSessionKey: currentEnvelope.encryptedSessionKey,
          algorithm: currentEnvelope.algorithm,
          updatedAt: currentEnvelope.updatedAt
        }
      : null,
    latestMessage: latestMessage
      ? {
          id: latestMessage._id.toString(),
          sender: latestMessage.sender.toString(),
          messageType: latestMessage.messageType,
          encryptedContent: latestMessage.encryptedContent,
          iv: latestMessage.iv,
          algorithm: latestMessage.algorithm,
          attachment: latestMessage.attachment || null,
          createdAt: latestMessage.createdAt
        }
      : null,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
}

function serializeMessage(message) {
  return {
    id: message._id.toString(),
    roomId: message.roomId,
    sender: message.sender?._id ? message.sender._id.toString() : message.sender.toString(),
    senderDisplayName: message.sender?.displayName || null,
    messageType: message.messageType || "text",
    encryptedContent: message.encryptedContent,
    iv: message.iv,
    algorithm: message.algorithm,
    attachment: message.attachment || null,
    createdAt: message.createdAt
  };
}

async function getAuthorizedRoom(roomId, currentUserId) {
  const normalizedRoomId = requireString(roomId, "roomId", { min: 8, max: 50 });
  const room = await ChatRoom.findOne({ roomId: normalizedRoomId });

  if (!room) {
    throw createHttpError(404, "Room not found");
  }

  const isAuthorized = room.participants.some(
    (participantId) => participantId.toString() === currentUserId.toString()
  );

  if (!isAuthorized) {
    throw createHttpError(403, "You do not have access to this room");
  }

  return { room, normalizedRoomId };
}

function attachmentKindFromMime(mimeType) {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  return "file";
}

export async function listRoomsForUser(userId) {
  const rooms = await ChatRoom.find({ participants: userId })
    .populate("createdBy", "displayName email publicKey")
    .populate("participants", "displayName email publicKey lastSeenAt")
    .sort({ updatedAt: -1 });

  const roomIds = rooms.map((room) => room.roomId);
  const latestMessages = await Message.aggregate([
    { $match: { roomId: { $in: roomIds } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$roomId",
        message: { $first: "$$ROOT" }
      }
    }
  ]);
  const latestByRoomId = new Map(latestMessages.map((entry) => [entry._id, entry.message]));

  return rooms.map((room) => serializeRoom(room, userId, latestByRoomId.get(room.roomId) || null));
}

export async function getRoomDetails(roomId, currentUserId) {
  const normalizedRoomId = requireString(roomId, "roomId", { min: 8, max: 50 });
  const room = await ChatRoom.findOne({ roomId: normalizedRoomId })
    .populate("createdBy", "displayName email publicKey")
    .populate("participants", "displayName email publicKey lastSeenAt");

  if (!room) {
    throw createHttpError(404, "Room not found");
  }

  const isParticipant = room.participants.some(
    (participant) => participant._id.toString() === currentUserId.toString()
  );

  if (!isParticipant) {
    throw createHttpError(403, "You do not have access to this room");
  }

  const messages = await Message.find({ roomId: normalizedRoomId })
    .populate("sender", "displayName")
    .sort({ createdAt: 1 })
    .limit(100);

  return {
    room: serializeRoom(room, currentUserId),
    messages: messages.map(serializeMessage)
  };
}

export async function saveKeyEnvelope({
  roomId,
  currentUserId,
  targetUserId,
  encryptedSessionKey,
  algorithm = "RSA-OAEP"
}) {
  const normalizedRoomId = requireString(roomId, "roomId", { min: 8, max: 50 });
  const normalizedEncryptedSessionKey = requireString(
    encryptedSessionKey,
    "encryptedSessionKey",
    { min: 20, max: 10000 }
  );
  const room = await ChatRoom.findOne({ roomId: normalizedRoomId });

  if (!room) {
    throw createHttpError(404, "Room not found");
  }

  const isAuthorized = room.participants.some(
    (participantId) => participantId.toString() === currentUserId.toString()
  );

  if (!isAuthorized) {
    throw createHttpError(403, "You do not have access to this room");
  }

  const envelopeIndex = room.keyEnvelopes.findIndex(
    (entry) => entry.user.toString() === targetUserId.toString()
  );

  if (envelopeIndex >= 0) {
    room.keyEnvelopes[envelopeIndex] = {
      user: targetUserId,
      encryptedSessionKey: normalizedEncryptedSessionKey,
      algorithm,
      updatedAt: new Date()
    };
  } else {
    room.keyEnvelopes.push({
      user: targetUserId,
      encryptedSessionKey: normalizedEncryptedSessionKey,
      algorithm,
      updatedAt: new Date()
    });
  }

  await room.save();

  return {
    ok: true
  };
}

export async function createEncryptedMessage({
  roomId,
  senderId,
  encryptedContent = null,
  iv = null,
  algorithm = "AES-GCM",
  messageType = "text",
  attachment = null
}) {
  const { normalizedRoomId } = await getAuthorizedRoom(roomId, senderId);

  if (messageType === "text") {
    requireString(encryptedContent, "encryptedContent", { min: 10, max: 20000 });
    requireString(iv, "iv", { min: 8, max: 1000 });
  }

  if (messageType !== "text" && !attachment) {
    throw createHttpError(400, "attachment metadata is required for non-text messages");
  }

  const message = await Message.create({
    roomId: normalizedRoomId,
    sender: senderId,
    messageType,
    encryptedContent,
    iv,
    algorithm,
    attachment
  });

  const populatedMessage = await Message.findById(message._id).populate("sender", "displayName");

  return serializeMessage(populatedMessage);
}

export async function createEncryptedAttachmentMessage({
  roomId,
  senderId,
  fileName,
  mimeType,
  fileSize,
  encryptedFile,
  iv,
  algorithm = "AES-GCM"
}) {
  const { normalizedRoomId } = await getAuthorizedRoom(roomId, senderId);
  const normalizedFileName = requireString(fileName, "fileName", { min: 1, max: 200 });
  const normalizedMimeType = requireString(mimeType, "mimeType", { min: 3, max: 120 });
  const normalizedIv = requireString(iv, "iv", { min: 8, max: 1000 });
  const normalizedEncryptedFile = requireString(encryptedFile, "encryptedFile", {
    min: 20,
    max: 25 * 1024 * 1024
  });
  const normalizedFileSize = requirePositiveInteger(fileSize, "fileSize", {
    min: 1,
    max: 10 * 1024 * 1024
  });

  const uploadsDir = path.resolve(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileId = `att_${crypto.randomBytes(12).toString("hex")}.bin`;
  const filePath = path.join(uploadsDir, fileId);
  const encryptedBuffer = Buffer.from(normalizedEncryptedFile, "base64");
  await fs.writeFile(filePath, encryptedBuffer);

  return createEncryptedMessage({
    roomId: normalizedRoomId,
    senderId,
    iv: normalizedIv,
    algorithm,
    messageType: attachmentKindFromMime(normalizedMimeType),
    attachment: {
      kind: attachmentKindFromMime(normalizedMimeType),
      fileName: normalizedFileName,
      mimeType: normalizedMimeType,
      fileSize: normalizedFileSize,
      encryptedSize: encryptedBuffer.byteLength,
      url: `/uploads/${fileId}`
    }
  });
}
