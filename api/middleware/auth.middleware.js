import { verifyAccessToken } from "../config/jwt.config.js";
import { logger } from "../utils/logger.js";

export const authenticate = (req, res, next) => {
  try {
    logger.info("Access Token Authentication started");

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn("Auth token missing from headers");
      return res.status(401).json({ error: "Authorization token missing" });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      logger.warn("Invalid format for the token");
      return res.status(401).json({ error: "Invalid authorization format" });
    }

    const token = parts[1];

    logger.info("Verifying the access token");
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      logger.warn("Access token invalid or expired");
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attaching payload to req object
    req.user = decoded;
    logger.info("Token verified successfully");

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};
