import pool from "../database/dbConnection.js";
import { logger } from "../utils/logger.js";

class UserController {
  // For Manager Dropdown
  async getManagers(req, res) {
    try {
      logger.info("Fetching all managers for employee sign up");
      const result = await pool.query(
        "SELECT id, name, role FROM users WHERE role = $1",
        ["MANAGER"]
      );

      if (result.rowCount === 0) {
        logger.warn("Managers data not found");

        return res.status(200).json({
          managers: [],
          message: "No managers found",
        });
      }

      logger.info("Managers fetched successfully");

      return res.status(200).json({
        managers: result.rows,
      });
    } catch (err) {
      logger.error("Error fetching managers", { error: err.message });

      return res.status(500).json({
        error: "Failed to fetch managers",
      });
    }
  }

  async getEmployees(req, res) {
    try {
      logger.info("Fetching all employee details");
      const result = await pool.query(
        "SELECT id, name, role, manager_id FROM users WHERE role = $1",
        ["EMPLOYEE"]
      );

      if (result.rowCount === 0) {
        logger.warn("Employees data not found");

        return res.status(200).json({
          employees: [],
          message: "No employees found",
        });
      }

      logger.info("employees fetched successfully");

      return res.status(200).json({
        employees: result.rows,
      });
    } catch (err) {
      logger.error("Error fetching employees", { error: err.message });

      return res.status(500).json({
        error: "Failed to fetch employees",
      });
    }
  }
}

export default new UserController();
