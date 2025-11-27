import express from "express";
import AuthController from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  signUpSchema,
  loginSchema,
  refreshSchema,
} from "../middleware/validations/auth.schema.js";

const router = express.Router();

router.post("/signup", validate(signUpSchema), AuthController.signUp);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/refresh", validate(refreshSchema), AuthController.refreshToken);

export default router;
