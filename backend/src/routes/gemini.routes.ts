import { Router } from "express";
import { geminiPing } from "../controllers/gemini.controller";

const router = Router();

router.get("/gemini/ping", geminiPing);

export default router;
