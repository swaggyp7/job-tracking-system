import { Router } from "express";
import { normalizeJob } from "../controllers/job.controller";

const router = Router();

router.post("/jobs/normalize", normalizeJob);

export default router;
