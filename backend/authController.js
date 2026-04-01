const User = require("./User");
const Notification = require("./Notification");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendNotification } = require("./socket");

/**
 * =========================
 * REGISTER USER (AUTO LOGIN)
 * =========================
 */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1️⃣ Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // 2️⃣ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // 5️⃣ Generate JWT token (AUTO LOGIN)
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 6️⃣ Send token to frontend
    res.status(201).json({
      token,
    });

  } catch (error) {
    console.error("🔥 REGISTER ERROR FULL 🔥", error);
    console.error("STACK 👉", error.stack);

    res.status(500).json({
      message: "Register error",
      error: error.message,
    });
  }
};

/**
 * =========================
 * LOGIN USER
 * =========================
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2️⃣ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 4️⃣ Generate JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 5️⃣ Save login notification
    const notification = await Notification.create({
      userId: user._id,
      message: "Login successful",
    });

    // 6️⃣ Send realtime notification
    sendNotification(user._id.toString(), notification);

    // 7️⃣ Success response
    res.status(200).json({
      token,
    });

  } catch (error) {
    console.error("LOGIN ERROR 👉", error);
    res.status(500).json({
      message: "Login error",
      error: error.message,
    });
  }
};
