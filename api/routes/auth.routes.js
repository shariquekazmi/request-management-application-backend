import express from "express";
import AuthController from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", (req, res) => AuthController.signUp(req, res));
router.post("/login", (req, res) => AuthController.login(req, res));
router.post("/refresh", AuthController.refreshToken);

export default router;
