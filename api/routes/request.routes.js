import express from "express";
import RequestController from "../controllers/request.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createRequestSchema,
  updateRequestSchema,
  getRequestByIdSchema,
} from "../middleware/validations/request.schema.js";

const router = express.Router();

router.post(
  "/create",
  authenticate,
  validate(createRequestSchema),
  RequestController.createRequest
);

// Dynamic route for updating a request based on users role
router.put(
  "/:id/:action",
  authenticate,
  validate(updateRequestSchema),
  RequestController.updateRequestStatus.bind(RequestController)
);

// Fetch all requests based on the role based filter
router.get("/", authenticate, RequestController.getAllRequests);

// Get single request
router.get(
  "/:id",
  authenticate,
  validate(getRequestByIdSchema),
  RequestController.getRequestById
);

router.get("/raised/by/user", authenticate, RequestController.fetchRaisedReq);

export default router;
