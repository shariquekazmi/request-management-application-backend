import pool from "../database/dbConnection.js";

class RequestController {
  async createRequest(req, res) {
    try {
      const { title, description, assigned_to } = req.body;
      const created_by = req.user.id;

      // Validate required fields
      const missing = [];
      if (!title) missing.push("title");
      if (!description) missing.push("description");
      if (!assigned_to) missing.push("assigned_to");

      if (missing.length > 0) {
        return res
          .status(400)
          .json({ error: `Missing required fields: ${missing.join(", ")}` });
      }
      if (req.user.id === assigned_to)
        return res
          .status(400)
          .json({ error: "Request cant be assigned to yourself" });

      // assigned employee check
      const assignedUser = await pool.query(
        "SELECT id, role, manager_id FROM users WHERE id = $1",
        [assigned_to]
      );

      if (assignedUser.rows.length === 0) {
        return res.status(400).json({ error: "Assigned user does not exist" });
      }

      // assigned user must be an employee
      if (assignedUser.rows[0].role !== "EMPLOYEE") {
        return res
          .status(400)
          .json({ error: "You can only assign requests to employees" });
      }

      const managerId = assignedUser.rows[0].manager_id;

      // Manager must exist
      if (!managerId) {
        return res
          .status(400)
          .json({
            error: "Request can't be assigned, employee has no manager",
          });
      }

      // create request
      const result = await pool.query(
        `INSERT INTO requests (title, description, created_by, assigned_to, manager_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [title, description, created_by, assigned_to, managerId]
      );

      const request = result.rows[0];

      // Logging history
      await pool.query(
        `INSERT INTO request_history (request_id, user_id, action)
         VALUES ($1, $2, $3)`,
        [request.id, created_by, "REQUEST_CREATED"]
      );

      return res.status(201).json({
        message: "Request created successfully",
        request,
      });
    } catch (err) {
      console.error("Create Request Error:", err);
      return res.status(500).json({ error: "Failed to create request" });
    }
  }
}

export default new RequestController();
