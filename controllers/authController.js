const { genToken } = require("../configs/token");
const crypto = require("crypto");
const RefreshToken = require("../model/refreshTokenModel");
const PEPPER = process.env.REFRESH_TOKEN_PEPPER || "default_pepper";
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { sendVerificationEmail } = require("./emailController");

function hmac(secret) {
  return crypto.createHmac("sha256", PEPPER).update(secret).digest("hex");
}
const User = require("../model/userModel");
const bcrypt = require("bcrypt");
const validator = require("email-validator");
const { access } = require("fs");

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: "User already exist",
      });
    }
    if (!validator.validate(email)) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    });
    const verificationUrl = `http://localhost:5173/verify-email?token=${emailVerificationToken}`;
    await sendVerificationEmail(newUser, verificationUrl);

    const token = genToken(newUser._id);
    const isProd = process.env.NODE_ENV === "production";
    // Generate refresh token
    const refreshTokenId = crypto.randomUUID();
    const refreshSecret = crypto.randomBytes(64).toString("hex");
    const refreshHash = hmac(refreshSecret);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      tokenId: refreshTokenId,
      userId: newUser._id,
      tokenHash: refreshHash,
      expiresAt: refreshExpires,
      deviceInfo: req.headers["user-agent"] || "unknown",
    });
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", `${refreshTokenId}.${refreshSecret}`, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { password: pass, ...rest } = newUser.toObject();
    return res.status(200).json({
      message: "Signup successful",
      user: rest,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Signup failed",
      error: err.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "User does not exist",
      });
    }

    if (!validator.validate(email)) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Check if user was created with Google ONLY if they don't have a regular password
    if (
      user.googleTokens &&
      Object.keys(user.googleTokens).length > 0 &&
      !user.password
    ) {
      return res.status(400).json({
        message:
          "This account was created with Google. Please use 'Continue with Google' to log in.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "Incorrect password",
      });
    }

    if (!user.isVerified) {
      // Generate new token and expiry
      const emailVerificationToken = crypto.randomBytes(32).toString("hex");
      const emailVerificationExpires = Date.now() + 60 * 60 * 1000; // 1 hour
      user.emailVerificationToken = emailVerificationToken;
      user.emailVerificationExpires = emailVerificationExpires;
      await user.save();
      const verificationUrl = `http://localhost:5173/verify-email?token=${emailVerificationToken}`;
      await sendVerificationEmail(user, verificationUrl);
      return res.status(403).json({
        message:
          "Email not verified. A new verification link has been sent to your email.",
      });
    }
    const token = genToken(user._id);
    const isProd = process.env.NODE_ENV === "production";
    // Invalidate all old refresh tokens for this user (optional, for single-session)
    // await RefreshToken.updateMany({ userId: user._id }, { revoked: true });
    // Generate new refresh token
    const refreshTokenId = crypto.randomUUID();
    const refreshSecret = crypto.randomBytes(64).toString("hex");
    const refreshHash = hmac(refreshSecret);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      tokenId: refreshTokenId,
      userId: user._id,
      tokenHash: refreshHash,
      expiresAt: refreshExpires,
      deviceInfo: req.headers["user-agent"] || "unknown",
    });
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", `${refreshTokenId}.${refreshSecret}`, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { password: pass, ...rest } = user.toObject();
    return res.status(200).json({
      message: "Login successful",
      user: rest,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Login failed",
      error: err.message,
    });
  }
};

const googleAuthController = async (req, res) => {
  try {
    const { accessToken, scope } = req.body;

    // Get user info using access token
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
    );
    const userInfo = await userInfoResponse.json();

    const { name, email } = userInfo;
    console.log("User info:", userInfo);

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with Google account
      const randomPassword = crypto.randomBytes(32).toString("hex");
      user = await User.create({
        name,
        email,
        password: randomPassword,
        isVerified: true, // Google users are automatically verified
        googleTokens: {
          accessToken,
          scope,
          expiryDate: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        },
      });
    } else {
      // Check if this is an existing normal account
      if (!user.googleTokens || Object.keys(user.googleTokens).length === 0) {
        // This is a normal email/password account
        return res.status(400).json({
          message:
            "This email is already registered with email/password. Please sign in using your password instead.",
        });
      }

      // Update existing Google user's tokens
      user.googleTokens = {
        accessToken,
        scope,
        expiryDate: new Date(Date.now() + 3600 * 1000),
      };
      // If user was created manually but now logging in with Google, mark as verified
      if (!user.isVerified) {
        user.isVerified = true;
      }
      await user.save();
    }
    const jwtToken = genToken(user._id);
    const isProd = process.env.NODE_ENV === "production";
    const refreshTokenId = crypto.randomUUID();
    const refreshSecret = crypto.randomBytes(64).toString("hex");
    const refreshHash = hmac(refreshSecret);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      tokenId: refreshTokenId,
      userId: user._id,
      tokenHash: refreshHash,
      expiresAt: refreshExpires,
      deviceInfo: req.headers["user-agent"] || "unknown",
    });
    res.cookie("accessToken", jwtToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", `${refreshTokenId}.${refreshSecret}`, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { password: pass, ...rest } = user.toObject();
    return res.status(200).json({
      message: "Google Auth successful",
      user: rest,
      accessToken: jwtToken,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Google Auth failed",
      error: err.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const cookies = req.cookies || {};
    const raw = cookies.refreshToken;
    if (raw) {
      const parts = raw.split(".");
      if (parts.length === 2) {
        const [tokenId, secret] = parts;
        const hash = hmac(secret);
        await RefreshToken.findOneAndUpdate(
          { tokenId, tokenHash: hash, revoked: false },
          { $set: { revoked: true } }
        );
      }
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Logout failed",
      error: err.message,
    });
  }
};

const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.isVerified) {
    return res.status(400).json({ message: "Email already verified" });
  }
  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  const emailVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  user.emailVerificationToken = emailVerificationToken;
  user.emailVerificationExpires = emailVerificationExpires;
  await user.save();
  const verificationUrl = `http://localhost:5173/verify-email?token=${emailVerificationToken}`;
  await sendVerificationEmail(user, verificationUrl);
  return res
    .status(200)
    .json({ message: "Verification email resent successfully" });
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ message: "Verification token missing" });
  }
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  return res.status(200).json({ message: "Email verified successfully" });
};

module.exports = {
  signup,
  login,
  logout,
  googleAuthController,
  verifyEmail,
  resendVerificationEmail,
};
