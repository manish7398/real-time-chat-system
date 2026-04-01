const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const { registerUser, loginUser } = require("./authController");
const authMiddleware = require("./authMiddleware");
const Notification = require("./Notification");

/* =========================
   RATE LIMITER (LOGIN)
========================= */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again after 15 minutes.",
  },
});

/* =========================
   AUTH ROUTES
========================= */

router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);

/* =========================
   GET USER NOTIFICATIONS
========================= */

router.get("/notifications", authMiddleware, async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
});

/* =========================
   MARK NOTIFICATION AS READ
========================= */

router.patch(
  "/notifications/:id/read",
  authMiddleware,
  async (req, res, next) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          userId: req.user.id, // 🔒 user can update only their own
        },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
