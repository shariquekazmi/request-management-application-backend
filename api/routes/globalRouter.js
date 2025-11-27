import express from "express";
import authRoutes from "./auth.routes.js";
import requestRoutes from "./request.routes.js";
import userRoutes from "./user.routes.js";

const router = express.Router();

// Feature route linking
router.use("/auth", authRoutes);
router.use("/requests", requestRoutes);
router.use("/users", userRoutes);

export default router;
