import { Router } from "express";
import jobRouter from "./job.routes";

const router = Router();

router.use(jobRouter);

export default router;
