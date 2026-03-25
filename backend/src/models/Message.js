import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["image", "video", "audio", "file"],
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    encryptedSize: {
      type: Number,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text"
    },
    encryptedContent: {
      type: String,
      default: null
    },
    iv: {
      type: String,
      default: null
    },
    algorithm: {
      type: String,
      default: "AES-GCM"
    },
    attachment: {
      type: attachmentSchema,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Message", messageSchema);
