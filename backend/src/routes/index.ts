import { Router } from "express";
import jobRouter from "./job.routes";
import geminiRouter from "./gemini.routes";

const router = Router();

router.use(jobRouter);
router.use(geminiRouter);

export default router;
