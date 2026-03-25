import crypto from "crypto";

export function createRoomId() {
  return `room_${crypto.randomBytes(8).toString("hex")}`;
}

export function createInviteCode() {
  return `inv_${crypto.randomBytes(6).toString("hex")}`;
}