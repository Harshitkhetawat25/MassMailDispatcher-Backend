const User = require("../model/userModel");
const jwt = require("jsonwebtoken");

const isAuth = async (req, res, next) => {
  try {
    const cookies = req.cookies || {};
    // Support all login methods: always use 'accessToken' (capital T)
    const token = cookies.accessToken;
    if (!token) {
      return res.status(401).json({
        message: "No authentication token provided",
      });
    }
    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!verifyToken) {
      return res.status(401).json({
        message: "Token not verified",
      });
    }
    req.userId = verifyToken.userId;
    // Attach user object to req for convenience
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Authentication failed",
      error: error.message,
    });
  }
};

module.exports = isAuth;
