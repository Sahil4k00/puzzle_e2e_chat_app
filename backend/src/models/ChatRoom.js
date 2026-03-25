import mongoose from "mongoose";

const keyEnvelopeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    encryptedSessionKey: {
      type: String,
      required: true
    },
    algorithm: {
      type: String,
      default: "RSA-OAEP"
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const chatRoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    keyEnvelopes: [keyEnvelopeSchema]
  },
  {
    timestamps: true
  }
);

export default mongoose.model("ChatRoom", chatRoomSchema);