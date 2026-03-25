import ChatRoom from "../models/ChatRoom.js";
import Invite from "../models/Invite.js";
import User from "../models/User.js";
import { createInviteCode, createRoomId } from "../utils/ids.js";
import { createHttpError } from "../utils/httpError.js";
import {
  hashAnswer,
  normalizeAnswer,
  requirePositiveInteger,
  requireString
} from "../utils/validators.js";

const FAIL_MESSAGES = [
  "Puzzle defeated you, but not your social life. Welcome in.",
  "The timer won this round. The chat room is still yours.",
  "Incorrect, dramatic, iconic. You can still join the room.",
  "The puzzle remains unconquered. Your chatting privileges remain intact."
];

function randomFailMessage() {
  return FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)];
}

export async function createInvite({ userId, puzzleQuestion, answer, timeLimitSeconds }) {
  const question = requireString(puzzleQuestion, "puzzleQuestion", { min: 8, max: 200 });
  const normalizedAnswer = normalizeAnswer(answer);
  const seconds = requirePositiveInteger(timeLimitSeconds, "timeLimitSeconds", {
    min: 10,
    max: 600
  });
  const roomId = createRoomId();
  const code = createInviteCode();

  await ChatRoom.create({
    roomId,
    createdBy: userId,
    participants: [userId]
  });

  const invite = await Invite.create({
    code,
    roomId,
    createdBy: userId,
    puzzleQuestion: question,
    answerHash: hashAnswer(normalizedAnswer),
    timeLimitSeconds: seconds,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
  });

  const baseUrl = process.env.APP_URL || "http://localhost:3000";

  return {
    code: invite.code,
    roomId,
    timeLimitSeconds: invite.timeLimitSeconds,
    puzzleQuestion: invite.puzzleQuestion,
    inviteUrl: `${baseUrl}/invite/${invite.code}`
  };
}

export async function getPublicInvite(code) {
  const invite = await Invite.findOne({ code }).populate("createdBy", "displayName email");

  if (!invite) {
    throw createHttpError(404, "Invite not found");
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    throw createHttpError(410, "Invite has expired");
  }

  return {
    code: invite.code,
    roomId: invite.roomId,
    puzzleQuestion: invite.puzzleQuestion,
    timeLimitSeconds: invite.timeLimitSeconds,
    inviter: invite.createdBy
      ? {
          id: invite.createdBy._id.toString(),
          displayName: invite.createdBy.displayName,
          email: invite.createdBy.email
        }
      : null
  };
}

export async function validateInvite({ code, answer, userId }) {
  const invite = await Invite.findOne({ code });

  if (!invite) {
    throw createHttpError(404, "Invite not found");
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    throw createHttpError(410, "Invite has expired");
  }

  const room = await ChatRoom.findOne({ roomId: invite.roomId });

  if (!room) {
    throw createHttpError(404, "Room not found");
  }

  const isParticipant = room.participants.some(
    (participantId) => participantId.toString() === userId.toString()
  );

  if (room.participants.length >= 2 && !isParticipant) {
    throw createHttpError(409, "This invite already has two participants");
  }

  if (!isParticipant) {
    room.participants.push(userId);
    await room.save();
  }

  const normalizedAttempt =
    typeof answer === "string" && answer.trim() ? answer.trim().toLowerCase() : "";
  const passed = normalizedAttempt && hashAnswer(normalizedAttempt) === invite.answerHash;
  const user = await User.findById(userId).select("displayName email");

  return {
    roomId: invite.roomId,
    code: invite.code,
    participant: user
      ? {
          id: user._id.toString(),
          displayName: user.displayName,
          email: user.email
        }
      : null,
    puzzle: {
      question: invite.puzzleQuestion,
      timeLimitSeconds: invite.timeLimitSeconds
    },
    result: passed ? "passed" : "failed",
    bannerMessage: passed
      ? "Puzzle solved. You unlocked the room like a legend."
      : randomFailMessage()
  };
}