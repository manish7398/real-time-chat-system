let ioInstance;
const Message = require("./Message");
const User = require("./User");

// online users map (userId -> socketId)
const onlineUsers = new Map();

const initSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // ===============================
    // JOIN USER ROOM
    // ===============================
    socket.on("joinRoom", async (userId) => {
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // ===============================
    // SEND MESSAGE
    // ===============================
    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
      // 1️⃣ Save to DB (status: sent)
      const msg = await Message.create({
        senderId,
        receiverId,
        message,
        status: "sent",
      });

      // 2️⃣ Deliver if receiver online
      const receiverOnline = onlineUsers.has(receiverId);
      if (receiverOnline) {
        io.to(receiverId).emit("receiveMessage", msg);

        // 3️⃣ Update to delivered
        msg.status = "delivered";
        await msg.save();

        // 4️⃣ Notify sender of delivery
        io.to(senderId).emit("messageDelivered", { messageId: msg._id });
      } else {
        // Send back to sender with sent status
        io.to(senderId).emit("messageSent", { messageId: msg._id, msg });
      }
    });

    // ===============================
    // MESSAGE SEEN
    // ===============================
    socket.on("messageSeen", async ({ messageId, senderId }) => {
      await Message.findByIdAndUpdate(messageId, { status: "seen" });
      io.to(senderId).emit("messageSeen", { messageId });
    });

    // ===============================
    // BULK MARK SEEN (when opening a chat)
    // ===============================
    socket.on("markAllSeen", async ({ senderId, receiverId }) => {
      const msgs = await Message.find({
        senderId,
        receiverId,
        status: { $ne: "seen" },
      });

      await Message.updateMany(
        { senderId, receiverId, status: { $ne: "seen" } },
        { status: "seen" }
      );

      const messageIds = msgs.map((m) => m._id);
      io.to(senderId).emit("allMessagesSeen", { messageIds });
    });

    // ===============================
    // TYPING
    // ===============================
    socket.on("typing", ({ receiverId, senderId }) => {
      io.to(receiverId).emit("typing", { senderId });
    });

    socket.on("stopTyping", ({ receiverId, senderId }) => {
      io.to(receiverId).emit("stopTyping", { senderId });
    });

    // ===============================
    // DELETE MESSAGE
    // ===============================
    socket.on("deleteMessage", async ({ messageId, senderId, receiverId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        await Message.findByIdAndDelete(messageId);
        io.to(receiverId).emit("messageDeleted", { messageId });
        io.to(senderId).emit("messageDeleted", { messageId });
      }
    });

    // ===============================
    // DISCONNECT
    // ===============================
    socket.on("disconnect", async () => {
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(uid);
          io.emit("onlineUsers", Array.from(onlineUsers.keys()));

          // Update lastSeen
          await User.findByIdAndUpdate(uid, { lastSeen: new Date() });
          break;
        }
      }
    });
  });
};

const sendNotification = (userId, payload) => {
  if (ioInstance) {
    ioInstance.to(userId).emit("notification", payload);
  }
};

module.exports = { initSocket, sendNotification };
