import { emitMessageToRoomParticipants } from "../sockets/chatSocket.js";
import * as roomService from "../services/roomService.js";

export async function listRooms(req, res, next) {
  try {
    const rooms = await roomService.listRoomsForUser(req.user._id);
    res.json({ rooms });
  } catch (error) {
    next(error);
  }
}

export async function getRoom(req, res, next) {
  try {
    const result = await roomService.getRoomDetails(req.params.roomId, req.user._id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function saveEnvelope(req, res, next) {
  try {
    const result = await roomService.saveKeyEnvelope({
      roomId: req.params.roomId,
      currentUserId: req.user._id,
      targetUserId: req.body.targetUserId || req.user._id,
      encryptedSessionKey: req.body.encryptedSessionKey,
      algorithm: req.body.algorithm
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function uploadAttachment(req, res, next) {
  try {
    const message = await roomService.createEncryptedAttachmentMessage({
      roomId: req.params.roomId,
      senderId: req.user._id,
      fileName: req.body.fileName,
      mimeType: req.body.mimeType,
      fileSize: req.body.fileSize,
      encryptedFile: req.body.encryptedFile,
      iv: req.body.iv,
      algorithm: req.body.algorithm
    });

    await emitMessageToRoomParticipants(req.params.roomId, message);
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
}
