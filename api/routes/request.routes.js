import express from "express";
import RequestController from "../controllers/request.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authenticate, RequestController.createRequest);

// Dynamic route for updating a request based on users role
router.put("/:id/:action", authenticate, (req, res) =>
  RequestController.updateRequestStatus(req, res)
);

// Fetch all requests based on the role based filter
router.get("/", authenticate, RequestController.getAllRequests);

// Get single request
router.get("/:id", authenticate, RequestController.getRequestById);

export default router;
