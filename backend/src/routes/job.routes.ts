import { Router } from "express";
import {
  createApplicationHandler,
  deleteApplicationHandler,
  getApplicationHandler,
  listApplicationsHandler,
  normalizeJob,
  updateApplicationHandler
} from "../controllers/job.controller";

const router = Router();

router.post("/jobs/normalize", normalizeJob);
router.post("/applications", createApplicationHandler);
router.get("/applications", listApplicationsHandler);
router.get("/applications/:id", getApplicationHandler);
router.put("/applications/:id", updateApplicationHandler);
router.delete("/applications/:id", deleteApplicationHandler);

export default router;
