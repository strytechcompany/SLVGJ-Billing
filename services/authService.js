const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const MONGO_URI      = process.env.MONGO_URI;
const GMAIL_USERNAME = process.env.GMAIL_USERNAME;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;

// ── Helpers ───────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

// ── OTP schema ────────────────────────────────────────────────────────────
const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date,   required: true },
});

// MongoDB auto-deletes expired OTP documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

// ── User schema ───────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  email:     { type: String, unique: true, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// ── Database connection ───────────────────────────────────────────────────
// Use mongoose.connection.readyState instead of a manual flag so that
// automatic reconnects after a network drop are handled correctly.
// States: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // already connected
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw new Error('Database connection failed. Please check your network or credentials.');
  }
}

// ── Email transporter ─────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USERNAME,
    pass: GMAIL_PASSWORD,
  },
});

// ── sendOTP ───────────────────────────────────────────────────────────────
async function sendOTP(email) {
  if (!isValidEmail(email)) {
    return { success: false, message: 'Invalid email address.' };
  }

  try {
    await connectDB();

    const otp       = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert: replace any existing OTP for this email
    await OTP.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await transporter.sendMail({
      from:    `"Sri Lakshmi Jewellers" <${GMAIL_USERNAME}>`,
      to:      email,
      subject: 'Your Login OTP',
      html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
          <h2 style="color:#d4af37;text-align:center;">Verification Code</h2>
          <p style="font-size:16px;color:#333;">Hello,</p>
          <p style="font-size:16px;color:#333;">Your OTP for Sri Lakshmi Jewellers Billing System is:</p>
          <div style="font-size:32px;font-weight:bold;text-align:center;color:#d4af37;padding:20px;background-color:#f9f9f9;border-radius:4px;letter-spacing:5px;">
              ${otp}
          </div>
          <p style="font-size:14px;color:#666;margin-top:20px;">This OTP expires in 5 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
          <p style="text-align:center;font-size:12px;color:#999;">© 2026 Sri Lakshmi Jewellers. All rights reserved.</p>
      </div>
      `,
    });

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { success: false, message: error.message || 'Failed to send OTP' };
  }
}

// ── verifyOTP ─────────────────────────────────────────────────────────────
async function verifyOTP(email, enteredOTP) {
  if (!isValidEmail(email)) {
    return { success: false, message: 'Invalid email address.' };
  }
  if (!enteredOTP || typeof enteredOTP !== 'string' || enteredOTP.trim().length === 0) {
    return { success: false, message: 'OTP is required.' };
  }

  try {
    await connectDB();

    const record = await OTP.findOne({ email });

    if (!record) {
      return { success: false, message: 'OTP not found. Please request a new one.' };
    }
    if (new Date() > record.expiresAt) {
      await OTP.deleteOne({ _id: record._id });
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }
    if (record.otp !== enteredOTP.trim()) {
      return { success: false, message: 'Invalid OTP. Please try again.' };
    }

    // Success — delete OTP and ensure user exists
    await OTP.deleteOne({ _id: record._id });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email });
    }

    return { success: true, message: 'Verification successful', user };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: error.message || 'An error occurred during verification' };
  }
}

// ── register ──────────────────────────────────────────────────────────────
async function register(email) {
  if (!isValidEmail(email)) {
    return { success: false, message: 'Invalid email address.' };
  }

  try {
    await connectDB();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { success: false, message: 'User already registered. Please log in.' };
    }
    return { success: true, message: 'Proceed to OTP verification' };
  } catch (error) {
    console.error('Error in registration check:', error);
    return { success: false, message: 'An error occurred. Please try again.' };
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
  register,
};
