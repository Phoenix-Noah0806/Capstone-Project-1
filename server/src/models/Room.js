import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    dataUrl: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true, index: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    strokes: { type: [mongoose.Schema.Types.Mixed], default: [] },
    redoStack: { type: [mongoose.Schema.Types.Mixed], default: [] },
    messages: { type: [messageSchema], default: [] },
    files: { type: [fileSchema], default: [] },
    snapshotDataUrl: { type: String, default: "" },
    mission: {
      status: {
        type: String,
        enum: ["idle", "active", "completed", "failed"],
        default: "idle"
      },
      name: { type: String, default: "" },
      description: { type: String, default: "" },
      type: { type: String, enum: ["free", "blind", "puzzle"], default: "free" },
      timerSeconds: { type: Number, default: 0 },
      startedAt: { type: Date },
      progress: { type: Number, default: 0 }, // 0-100
      stage: { type: Number, default: 0 },
      hintHolders: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      puzzle: {
        parts: [
          {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            partIndex: { type: Number },
            delivered: { type: Boolean, default: false }
          }
        ],
        completed: { type: Boolean, default: false }
      },
      score: { type: Number, default: 0 }
    },
    roles: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["host", "architect", "artist", "analyst", "participant"],
          default: "participant"
        }
      }
    ],
    scoreboard: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        xp: { type: Number, default: 0 },
        contributions: { type: Number, default: 0 }
      }
    ],
    missionHistory: [
      {
        name: String,
        completedAt: Date,
        score: Number,
        status: String
      }
    ]
  },
  { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);
