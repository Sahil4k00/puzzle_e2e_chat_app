import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { createHttpError } from "../utils/httpError.js";
import { signToken } from "../utils/jwt.js";
import { requireEmail, requirePassword, requireString } from "../utils/validators.js";

function serializeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    publicKey: user.publicKey,
    createdAt: user.createdAt
  };
}

export async function signup({ email, password, displayName, publicKey }) {
  const normalizedEmail = requireEmail(email);
  const normalizedPassword = requirePassword(password);
  const normalizedDisplayName = requireString(displayName, "displayName", {
    min: 2,
    max: 60
  });
  const normalizedPublicKey = requireString(publicKey, "publicKey", {
    min: 50,
    max: 10000
  });

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw createHttpError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, 12);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    displayName: normalizedDisplayName,
    publicKey: normalizedPublicKey
  });

  return {
    token: signToken(user._id.toString()),
    user: serializeUser(user)
  };
}

export async function login({ email, password, publicKey }) {
  const normalizedEmail = requireEmail(email);
  const normalizedPassword = requirePassword(password);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw createHttpError(401, "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(normalizedPassword, user.passwordHash);

  if (!isValidPassword) {
    throw createHttpError(401, "Invalid email or password");
  }

  if (typeof publicKey === "string" && publicKey.trim()) {
    user.publicKey = requireString(publicKey, "publicKey", { min: 50, max: 10000 });
    await user.save();
  }

  return {
    token: signToken(user._id.toString()),
    user: serializeUser(user)
  };
}

export async function me(userId) {
  const user = await User.findById(userId).select("-passwordHash");

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return serializeUser(user);
}