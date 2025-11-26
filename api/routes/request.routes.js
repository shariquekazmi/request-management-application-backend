import express from "express";
import RequestController from "../controllers/request.controller.js";

const router = express.Router();

router.post("/", (req, res) => RequestController.createRequest(req, res));
// later: approve, reject, action, close

export default router;
