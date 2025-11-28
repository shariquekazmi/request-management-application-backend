import express from "express";
import userController from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/managers", userController.getManagers);
router.get("/employees", authenticate, userController.getEmployees);

export default router;
