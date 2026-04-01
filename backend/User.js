const mongoose = require("mongoose");

const AVATAR_COLORS = [
  "#00d4a8", "#7c3aed", "#ef4444", "#f97316",
  "#eab308", "#06b6d4", "#ec4899", "#10b981",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // ✅ NEW: avatar color for user avatar circles
    avatarColor: {
      type: String,
      default: function () {
        return AVATAR_COLORS[
          Math.floor(Math.random() * AVATAR_COLORS.length)
        ];
      },
    },
    // ✅ NEW: last seen timestamp
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
