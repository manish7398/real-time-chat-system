const express = require("express");
const router = express.Router();
const Message = require("./Message");
const authMiddleware = require("./authMiddleware");

// ✅ GET chat history between two users
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
      deletedFor: { $ne: myId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Return in chronological order
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: "Failed to load messages" });
  }
});

// ✅ NEW: DELETE message (for me only)
router.delete("/:messageId", authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only sender can delete for everyone
    if (deleteForEveryone && message.senderId.toString() === myId) {
      await Message.findByIdAndDelete(messageId);
      return res.json({ message: "Message deleted for everyone", deletedForEveryone: true });
    }

    // Delete for me only
    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: myId },
    });

    res.json({ message: "Message deleted for you" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete message" });
  }
});

module.exports = router;
