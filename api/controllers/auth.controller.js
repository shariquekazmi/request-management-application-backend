import bcrypt from "bcrypt";
import pool from "../database/dbConnection.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../config/jwt.config.js";
import { logger } from "../utils/logger.js";

class AuthController {
  async signUp(req, res) {
    try {
      const { name, email, password, role, manager_id } = req.body;

      logger.info("Signup attempt started", { email, role });

      const missingFields = [];

      if (!name) missingFields.push("name");
      if (!email) missingFields.push("email");
      if (!password) missingFields.push("password");
      if (!role) missingFields.push("role");

      if (missingFields.length > 0) {
        logger.warn("Signup failed - Missing fields", { missingFields });
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      if (role === "EMPLOYEE" && !manager_id) {
        logger.warn("Signup failed - Employee without manager", { email });
        return res.status(400).json({
          error: "Manager must be selected for employees",
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        logger.warn("Signup failed - Invalid email format", { email });
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Checking if email already exists
      logger.info("Checking if email already exists", { email });
      const emailCheck = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (emailCheck.rows.length > 0) {
        logger.warn("Signup failed - Email already registered", { email });
        return res.status(400).json({ error: "Email already registered" });
      }

      //if role other than the specified enums
      if (!["EMPLOYEE", "MANAGER"].includes(role)) {
        logger.warn("Signup failed - Invalid role", { email, role });
        return res.status(400).json({ error: "Invalid role" });
      }

      // if choosing role as EMPLOYEE then manager_id MUST be provided
      if (role === "EMPLOYEE" && !manager_id) {
        logger.warn("Employee role must have a manager", { manager_id });
        return res
          .status(400)
          .json({ error: "Employee must have a manager_id" });
      }

      // If role is employee then validating that manager exists
      if (role === "EMPLOYEE") {
        logger.info("Validating assigned manager", { manager_id });
        const managerCheck = await pool.query(
          "SELECT id FROM users WHERE id = $1 AND role = 'MANAGER'",
          [manager_id]
        );

        if (managerCheck.rows.length === 0) {
          logger.warn("Signup failed - Invalid manager_id", {
            email,
            manager_id,
          });
          return res
            .status(400)
            .json({ error: "Sign Up failed, Invalid manager_id" });
        }
      }

      // Hashing the user's password
      logger.info("Hashing password for user", { email });
      const hashedPassword = await bcrypt.hash(password, 10);

      // Inserting the user
      logger.info("Inserting new user into database", { email, role });

      const result = await pool.query(
        `INSERT INTO users(name, email, password, role, manager_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, manager_id, created_at`,
        [name, email, hashedPassword, role, manager_id || null]
      );

      logger.info("User registered successfully", {
        userId: result.rows[0].id,
        role,
      });

      return res.status(201).json({
        message: "User registered successfully",
      });
    } catch (err) {
      console.error("Signup error:", err);
      return res
        .status(400)
        .json({ error: "Signup Error, Please try again in some time" });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      logger.info("Login attempt started", { email });

      // Input validation
      const missingFields = [];

      if (!email) missingFields.push("email");
      if (!password) missingFields.push("password");

      if (missingFields.length > 0) {
        logger.warn("Login failed - Missing fields", { missingFields });
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      logger.info("Checking if user exists", { email });

      // Fetch user by email
      const result = await pool.query(
        "SELECT id, name, email, password, role, manager_id FROM users WHERE email = $1",
        [email]
      );

      if (result.rows.length === 0) {
        logger.warn("Login failed - User not found", { email });
        return res.status(400).json({ error: "Invalid email, User not found" });
      }

      const user = result.rows[0];

      logger.info("User Found, Validating user password", { userId: user.id });

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        logger.warn("Login failed - Incorrect password", { userId: user.id });
        return res.status(400).json({ error: "password" });
      }

      logger.info("Generating JWT tokens", {
        userId: user.id,
        role: user.role,
      });

      // JWT payload
      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        manager_id: user.manager_id,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken({ id: user.id });

      logger.info("Login successful", { userId: user.id, role: user.role });

      return res.status(200).json({
        message: "Login successful",
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("Login Error:", err);
      return res
        .status(400)
        .json({ error: "Error logging in, please try again later" });
    }
  }

  async refreshToken(req, res) {
    try {
      logger.info("Refresh token request received");

      const { refreshToken } = req.body;

      if (!refreshToken) {
        logger.warn("Refresh token missing in request body");
        return res.status(400).json({ error: "Refresh token is required" });
      }

      logger.info("Verifying refresh token");

      // verifying the refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        logger.warn("Refresh token verification failed - invalid or expired");
        return res
          .status(401)
          .json({ error: "Invalid or expired refresh token" });
      }

      const userId = decoded.id;
      logger.info("Refresh token decoded successfully", { userId });

      logger.info("Checking user existence", { userId });

      // User availaibility check
      const result = await pool.query(
        "SELECT id, name, email, role, manager_id FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        logger.warn("Refresh token authentication failed - User not found", {
          userId,
        });
        return res.status(404).json({ error: "User not found" });
      }

      const user = result.rows[0]; // Since only single user with that id can exist.

      // New access token generation
      const newAccessToken = generateAccessToken({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        manager_id: user.manager_id,
      });

      logger.info("New access token generated successfully", { userId });

      return res.status(200).json({
        message: "New access token generated",
        accessToken: newAccessToken,
      });
    } catch (err) {
      console.error("Refresh token error:", err);
      return res.status(500).json({ error: "Could not refresh token" });
    }
  }
}

export default new AuthController();
