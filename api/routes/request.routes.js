import express from "express";
import RequestController from "../controllers/request.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authenticate, RequestController.createRequest);
// later: approve, reject, action, close

export default router;
