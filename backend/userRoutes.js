const express = require("express");
const router = express.Router();
const User = require("./User");
const Message = require("./Message");
const authMiddleware = require("./authMiddleware");

// ✅ GET all users except logged-in user (with optional search)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    const query = { _id: { $ne: req.user.id } };

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const users = await User.find(query, "name email avatarColor lastSeen");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// ✅ NEW: GET unread message counts from all users
router.get("/unread-counts", authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: require("mongoose").Types.ObjectId.createFromHexString(myId),
          status: { $ne: "seen" },
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to { userId: count } map
    const result = {};
    unreadCounts.forEach(({ _id, count }) => {
      result[_id.toString()] = count;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to get unread counts" });
  }
});

module.exports = router;
