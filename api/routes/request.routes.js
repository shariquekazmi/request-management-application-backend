import express from "express";
import RequestController from "../controllers/request.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authenticate, (req, res) => {
  //   RequestController.createRequest(req, res)
  console.log("user is authenticated");
  return res.status(200).json({ success: true, user: req.user });
});
// later: approve, reject, action, close

export default router;
