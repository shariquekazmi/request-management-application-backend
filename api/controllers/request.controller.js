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
        return res.status(400).json({
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

  async updateRequestStatus(req, res) {
    try {
      const requestId = req.params.id;
      const action = req.params.action.toUpperCase();
      const user = req.user;

      // Fetch request
      const result = await pool.query("SELECT * FROM requests WHERE id = $1", [
        requestId,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      const request = result.rows[0];

      // ROLE-BASED ACTION LOGIC
      // --------------------------

      /** MANAGER ACTIONS: APPROVE or REJECT */
      if (user.role === "MANAGER") {
        if (request.manager_id !== user.id) {
          return res
            .status(403)
            .json({ error: "Not authorized for this request" });
        }

        if (request.status !== "PENDING_MANAGER_APPROVAL") {
          return res.status(400).json({ error: "Request already processed" });
        }

        if (action === "APPROVE") {
          return await this.managerAction(
            requestId,
            user.id,
            "MANAGER_APPROVED",
            res
          );
        }

        if (action === "REJECT") {
          return await this.managerAction(
            requestId,
            user.id,
            "MANAGER_REJECTED",
            res
          );
        }

        return res.status(400).json({ error: "Invalid action for manager" });
      }

      /**  EMPLOYEE ACTIONS: Take Action or Close */
      if (user.role === "EMPLOYEE") {
        if (request.assigned_to !== user.id) {
          return res
            .status(403)
            .json({ error: "Not authorized for this request" });
        }

        if (request.status === "MANAGER_REJECTED") {
          return res
            .status(400)
            .json({ error: "Request has been rejected already " });
        }

        if (action === "ACTION") {
          if (request.status !== "APPROVED") {
            return res.status(400).json({ error: "Request not approved yet" });
          }

          return await this.employeeAction(
            requestId,
            user.id,
            "ACTION_IN_PROGRESS",
            res
          );
        }

        if (action === "CLOSE") {
          if (request.status !== "ACTION_IN_PROGRESS") {
            return res
              .status(400)
              .json({ error: "Request needs to be in ACTION before closing" });
          }

          return await this.employeeAction(requestId, user.id, "CLOSED", res);
        }

        return res.status(400).json({ error: "Invalid action for employee" });
      }

      return res.status(403).json({ error: "Unauthorized role" });
    } catch (err) {
      console.error("Update Request Error:", err);
      return res.status(500).json({ error: "Failed to update request" });
    }
  }

  // Reusable function for manager actions
  async managerAction(requestId, userId, newStatus, res) {
    await pool.query(
      "UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2",
      [newStatus, requestId]
    );

    await pool.query(
      "INSERT INTO request_history (request_id, user_id, action) VALUES ($1, $2, $3)",
      [requestId, userId, newStatus]
    );

    return res.status(200).json({
      message: `Request ${newStatus.toLowerCase()}`,
      status: newStatus,
    });
  }

  // Reusable function for employee actions
  async employeeAction(requestId, userId, newStatus, res) {
    await pool.query(
      "UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2",
      [newStatus, requestId]
    );

    await pool.query(
      "INSERT INTO request_history (request_id, user_id, action) VALUES ($1, $2, $3)",
      [requestId, userId, newStatus]
    );

    return res.status(200).json({
      message: `Request ${newStatus.toLowerCase()}`,
      status: newStatus,
    });
  }

  async getAllRequests(req, res) {
    try {
      const user = req.user;

      let query = "";
      let params = [];

      // For MANAGER Fetch only pending approvals
      if (user.role === "MANAGER") {
        query = `
        SELECT r.*, 
          u1.name AS created_by_name,
          u2.name AS assigned_to_name
        FROM requests r
        LEFT JOIN users u1 ON r.created_by = u1.id
        LEFT JOIN users u2 ON r.assigned_to = u2.id
        WHERE r.manager_id = $1
          AND r.status IN ('PENDING_MANAGER_APPROVAL', 'MANAGER_APPROVED', 'MANAGER_REJECTED')
        ORDER BY r.created_at DESC
      `;
        params = [user.id];
      }

      // ⭐ For EMPLOYEE Fetching only MANAGER_APPROVED or ACTION_IN_PROGRESS
      else if (user.role === "EMPLOYEE") {
        query = `
        SELECT r.*, 
          u1.name AS created_by_name,
          u2.name AS assigned_to_name
        FROM requests r
        LEFT JOIN users u1 ON r.created_by = u1.id
        LEFT JOIN users u2 ON r.assigned_to = u2.id
        WHERE r.assigned_to = $1
          AND r.status IN ('MANAGER_APPROVED', 'ACTION_IN_PROGRESS')
        ORDER BY r.created_at DESC
      `;
        params = [user.id];
      }

      const result = await pool.query(query, params);

      return res.status(200).json({
        requests: result.rows,
      });
    } catch (err) {
      console.error("Get All Requests Error:", err);
      return res.status(500).json({ error: "Failed to fetch requests" });
    }
  }

  // FETCH Single request
  async getRequestById(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const query = `
      SELECT r.*, 
        u1.name AS created_by_name,
        u2.name AS assigned_to_name,
        m.name AS manager_name
      FROM requests r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      LEFT JOIN users m ON r.manager_id = m.id
      WHERE r.id = $1
    `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      const request = result.rows[0];

      // checking permission
      if (user.role === "MANAGER" && request.manager_id !== user.id) {
        return res
          .status(403)
          .json({ error: "Not authorized to view this request" });
      }

      const isOwner = request.created_by === user.id;
      const isAssignee = request.assigned_to === user.id;

      if (user.role === "EMPLOYEE" && !isOwner && !isAssignee) {
        return res.status(403).json({ error: "Not authorized" });
      }

      return res.status(200).json({ request });
    } catch (err) {
      console.error("Get Request Error:", err);
      return res.status(500).json({ error: "Failed to fetch request" });
    }
  }
}

export default new RequestController();
