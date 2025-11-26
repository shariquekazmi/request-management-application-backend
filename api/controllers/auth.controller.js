import bcrypt from "bcrypt";
import pool from "../database/dbConnection.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../config/jwt.config.js";

class AuthController {
  async signUp(req, res) {
    try {
      const { name, email, password, role, manager_id } = req.body;

      const missingFields = [];

      if (!name) missingFields.push("name");
      if (!email) missingFields.push("email");
      if (!password) missingFields.push("password");
      if (!role) missingFields.push("role");

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      if (role === "EMPLOYEE" && !manager_id) {
        return res.status(400).json({
          error: "Manager must be selected for employees",
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Checking if email already exists
      const emailCheck = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      console.log("email", emailCheck);

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      //if role other than the specified enums
      if (!["EMPLOYEE", "MANAGER"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // if choosing role as EMPLOYEE then manager_id MUST be provided
      if (role === "EMPLOYEE" && !manager_id) {
        return res
          .status(400)
          .json({ error: "Employee must have a manager_id" });
      }

      // If role is employee then validating that manager exists
      if (role === "EMPLOYEE") {
        const managerCheck = await pool.query(
          "SELECT id FROM users WHERE id = $1 AND role = 'MANAGER'",
          [manager_id]
        );

        if (managerCheck.rows.length === 0) {
          return res.status(400).json({ error: "Invalid manager_id" });
        }
      }

      // Hashing the user's password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Inserting the user
      const result = await pool.query(
        `INSERT INTO users(name, email, password, role, manager_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, manager_id, created_at`,
        [name, email, hashedPassword, role, manager_id || null]
      );

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
      // Input validation
      const missingFields = [];

      if (!email) missingFields.push("email");
      if (!password) missingFields.push("password");

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      // Fetch user by email
      const result = await pool.query(
        "SELECT id, name, email, password, role, manager_id FROM users WHERE email = $1",
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: "Invalid email, User not found" });
      }

      const user = result.rows[0];

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ error: "password" });
      }

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
}

export default new AuthController();
