import { Router } from "express";
import {
  createApplicationHandler,
  deleteApplicationHandler,
  getApplicationDetailHandler,
  getApplicationHandler,
  importApplicationHandler,
  listApplicationsHandler,
  updateApplicationHandler
} from "../controllers/job.controller";

const router = Router();

router.post("/applications", createApplicationHandler);
router.post("/applications/import", importApplicationHandler);
router.get("/applications", listApplicationsHandler);
router.get("/applications/:id/detail", getApplicationDetailHandler);
router.get("/applications/:id", getApplicationHandler);
router.put("/applications/:id", updateApplicationHandler);
router.delete("/applications/:id", deleteApplicationHandler);

export default router;
