import pool from "../database/dbConnection.js";

class RequestController {
  async createRequest(req, res) {
    try {
      const { title, description, assigned_to } = req.body;
      const created_by = req.user.id;

      logger.info("Create request attempt", { created_by, assigned_to });

      // Validate required fields
      const missing = [];
      if (!title) missing.push("title");
      if (!description) missing.push("description");
      if (!assigned_to) missing.push("assigned_to");

      if (missing.length > 0) {
        logger.warn("Create request failed - Missing fields", { missing });
        return res
          .status(400)
          .json({ error: `Missing required fields: ${missing.join(", ")}` });
      }

      if (req.user.id === assigned_to) {
        logger.warn("Create request failed - Assigned to self", { created_by });
        return res
          .status(400)
          .json({ error: "Request cant be assigned to yourself" });
      }

      // assigned employee check
      logger.info("Checking assigned user", { assigned_to });

      const assignedUser = await pool.query(
        "SELECT id, role, manager_id FROM users WHERE id = $1",
        [assigned_to]
      );

      if (assignedUser.rows.length === 0) {
        logger.warn("Assigned user does not exist", { assigned_to });
        return res.status(400).json({ error: "Assigned user does not exist" });
      }

      // assigned user must be an employee
      if (assignedUser.rows[0].role !== "EMPLOYEE") {
        logger.warn("Assigned user is not an employee", { assigned_to });
        return res
          .status(400)
          .json({ error: "You can only assign requests to employees" });
      }

      const managerId = assignedUser.rows[0].manager_id;

      // Manager must exist
      if (!managerId) {
        logger.warn("Assigned employee has no manager", { assigned_to });
        return res.status(400).json({
          error: "Request can't be assigned, employee has no manager",
        });
      }

      // create request
      logger.info("Inserting new request", {
        created_by,
        assigned_to,
        managerId,
      });

      const result = await pool.query(
        `INSERT INTO requests (title, description, created_by, assigned_to, manager_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
        [title, description, created_by, assigned_to, managerId]
      );

      const request = result.rows[0];

      // Logging history
      logger.info("Logging request history", {
        requestId: request.id,
        created_by,
      });

      await pool.query(
        `INSERT INTO request_history (request_id, user_id, action)
       VALUES ($1, $2, $3)`,
        [request.id, created_by, "REQUEST_CREATED"]
      );

      logger.info("Request created successfully", { requestId: request.id });

      return res.status(201).json({
        message: "Request created successfully",
        request,
      });
    } catch (err) {
      logger.error("Create Request Error", { error: err.message });
      return res.status(500).json({ error: "Failed to create request" });
    }
  }

  async updateRequestStatus(req, res) {
    try {
      const requestId = req.params.id;
      const action = req.params.action.toUpperCase();
      const user = req.user;

      logger.info("Update request status attempt", {
        requestId,
        action,
        userId: user.id,
        role: user.role,
      });

      // Fetch request
      const result = await pool.query("SELECT * FROM requests WHERE id = $1", [
        requestId,
      ]);

      if (result.rows.length === 0) {
        logger.warn("Request not found", { requestId });
        return res.status(404).json({ error: "Request not found" });
      }

      const request = result.rows[0];

      /** MANAGER ACTIONS: APPROVE or REJECT */
      if (user.role === "MANAGER") {
        logger.info("Manager attempting action", {
          requestId,
          managerId: user.id,
          action,
        });

        if (request.manager_id !== user.id) {
          logger.warn("Manager unauthorized for this request", {
            managerId: user.id,
            requestManager: request.manager_id,
          });
          return res
            .status(403)
            .json({ error: "Not authorized for this request" });
        }

        if (request.status !== "PENDING_MANAGER_APPROVAL") {
          logger.warn("Manager tried to process already processed request", {
            requestId,
            currentStatus: request.status,
          });
          return res.status(400).json({ error: "Request already processed" });
        }

        if (action === "APPROVE") {
          logger.info("Manager approving request", {
            requestId,
            managerId: user.id,
          });
          return await this.managerAction(
            requestId,
            user.id,
            "MANAGER_APPROVED",
            res
          );
        }

        if (action === "REJECT") {
          logger.info("Manager rejecting request", {
            requestId,
            managerId: user.id,
          });
          return await this.managerAction(
            requestId,
            user.id,
            "MANAGER_REJECTED",
            res
          );
        }

        logger.warn("Invalid manager action attempted", { action });
        return res.status(400).json({ error: "Invalid action for manager" });
      }

      /** EMPLOYEE ACTIONS: Take Action or Close */
      if (user.role === "EMPLOYEE") {
        logger.info("Employee attempting action", {
          requestId,
          employeeId: user.id,
          action,
        });

        if (request.assigned_to !== user.id) {
          logger.warn("Employee unauthorized for this request", {
            employeeId: user.id,
            assignedTo: request.assigned_to,
          });
          return res
            .status(403)
            .json({ error: "Not authorized for this request" });
        }

        if (request.status === "MANAGER_REJECTED") {
          logger.warn("Employee tried to act on rejected request", {
            requestId,
          });
          return res.status(400).json({
            error: "Request has been rejected already ",
          });
        }

        if (action === "ACTION") {
          if (request.status !== "APPROVED") {
            logger.warn("Employee attempted ACTION before approval", {
              requestId,
              status: request.status,
            });
            return res.status(400).json({ error: "Request not approved yet" });
          }

          logger.info("Employee taking action on request", {
            requestId,
            employeeId: user.id,
          });

          return await this.employeeAction(
            requestId,
            user.id,
            "ACTION_IN_PROGRESS",
            res
          );
        }

        if (action === "CLOSE") {
          if (request.status !== "ACTION_IN_PROGRESS") {
            logger.warn("Employee attempted CLOSE without ACTION", {
              requestId,
              status: request.status,
            });
            return res.status(400).json({
              error: "Request needs to be in ACTION before closing",
            });
          }

          logger.info("Employee closing request", {
            requestId,
            employeeId: user.id,
          });

          return await this.employeeAction(requestId, user.id, "CLOSED", res);
        }

        logger.warn("Invalid employee action attempted", { action });
        return res.status(400).json({ error: "Invalid action for employee" });
      }

      logger.warn("Unauthorized role attempted request update", {
        role: user.role,
      });
      return res.status(403).json({ error: "Unauthorized role" });
    } catch (err) {
      logger.error("Update Request Error", { error: err.message });
      return res.status(500).json({ error: "Failed to update request" });
    }
  }

  // Reusable function for manager actions
  async managerAction(requestId, userId, newStatus, res) {
    logger.info("Manager action started", { requestId, userId, newStatus });

    await pool.query(
      "UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2",
      [newStatus, requestId]
    );

    logger.info("Request status updated by manager", {
      requestId,
      managerId: userId,
      newStatus,
    });

    await pool.query(
      "INSERT INTO request_history (request_id, user_id, action) VALUES ($1, $2, $3)",
      [requestId, userId, newStatus]
    );

    logger.info("Request history logged for manager action", {
      requestId,
      managerId: userId,
      action: newStatus,
    });

    return res.status(200).json({
      message: `Request ${newStatus.toLowerCase()}`,
      status: newStatus,
    });
  }

  // Reusable function for employee actions
  async employeeAction(requestId, userId, newStatus, res) {
    logger.info("Employee action started", { requestId, userId, newStatus });

    await pool.query(
      "UPDATE requests SET status=$1, updated_at=NOW() WHERE id=$2",
      [newStatus, requestId]
    );

    logger.info("Request status updated by employee", {
      requestId,
      employeeId: userId,
      newStatus,
    });

    await pool.query(
      "INSERT INTO request_history (request_id, user_id, action) VALUES ($1, $2, $3)",
      [requestId, userId, newStatus]
    );

    logger.info("Request history logged for employee action", {
      requestId,
      employeeId: userId,
      action: newStatus,
    });

    return res.status(200).json({
      message: `Request ${newStatus.toLowerCase()}`,
      status: newStatus,
    });
  }

  async getAllRequests(req, res) {
    try {
      const user = req.user;

      logger.info("Fetching all requests", {
        userId: user.id,
        role: user.role,
      });

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

      // For EMPLOYEE Fetching only MANAGER_APPROVED or ACTION_IN_PROGRESS
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

      logger.info("Fetched requests successfully", {
        userId: user.id,
        total: result.rows.length,
      });

      return res.status(200).json({
        requests: result.rows,
      });
    } catch (err) {
      logger.error("Get All Requests Error", { error: err.message });
      return res.status(500).json({ error: "Failed to fetch requests" });
    }
  }

  // FETCH Single request
  async getRequestById(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      logger.info("Fetching request", {
        requestId: id,
        userId: user.id,
        role: user.role,
      });

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
        logger.warn("Request not found", { requestId: id });
        return res.status(404).json({ error: "Request not found" });
      }

      const request = result.rows[0];

      // checking permission
      if (user.role === "MANAGER" && request.manager_id !== user.id) {
        logger.warn("Current Manager unauthorized to view request", {
          requestId: id,
          managerId: user.id,
          actualManager: request.manager_id,
        });

        return res
          .status(403)
          .json({ error: "Not authorized to view this request" });
      }

      const isOwner = request.created_by === user.id;
      const isAssignee = request.assigned_to === user.id;

      if (user.role === "EMPLOYEE" && !isOwner && !isAssignee) {
        logger.warn("Employee unauthorized to view request", {
          requestId: id,
          employeeId: user.id,
        });

        return res.status(403).json({ error: "Not authorized" });
      }

      logger.info("Fetched request successfully", {
        requestId: id,
        userId: user.id,
      });

      return res.status(200).json({ request });
    } catch (err) {
      logger.error("Get Request Error", { error: err.message });
      return res.status(500).json({ error: "Failed to fetch request" });
    }
  }
}

export default new RequestController();
