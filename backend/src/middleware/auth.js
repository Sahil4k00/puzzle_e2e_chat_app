import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";

export async function requireAuth(req, _res, next) {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      const error = new Error("Authentication required");
      error.status = 401;
      throw error;
    }

    const token = authorization.slice("Bearer ".length);
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("-passwordHash");

    if (!user) {
      const error = new Error("User not found");
      error.status = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}