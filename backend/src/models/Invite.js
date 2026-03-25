import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    roomId: {
      type: String,
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    puzzleQuestion: {
      type: String,
      required: true,
      trim: true
    },
    answerHash: {
      type: String,
      required: true
    },
    timeLimitSeconds: {
      type: Number,
      required: true,
      min: 5,
      max: 600
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Invite", inviteSchema);