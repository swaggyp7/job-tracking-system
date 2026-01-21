import { Request, Response } from "express";
import { normalizeJobData } from "../services/jobParser.service";
import {
  createApplication,
  deleteApplication,
  getApplicationById,
  listApplications,
  updateApplication,
  ApplicationStatus
} from "../services/job.service";

export function normalizeJob(req: Request, res: Response): void {
  const { company, title } = req.body ?? {};
  const normalized = normalizeJobData({ company, title });
  res.json({ data: normalized });
}

function parseApplicationId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid application id" });
    return null;
  }
  return id;
}

function isValidStatus(status: unknown): status is ApplicationStatus {
  return (
    status === "applied" ||
    status === "interview" ||
    status === "rejected" ||
    status === "closed"
  );
}

export async function createApplicationHandler(
  req: Request,
  res: Response
): Promise<void> {
  const {
    companyName,
    jobTitle,
    location,
    sourceUrl,
    status,
    applyTime,
    softSkills,
    skills
  } = req.body ?? {};

  if (!companyName || typeof companyName !== "string") {
    res.status(400).json({ error: "companyName is required" });
    return;
  }

  if (status !== undefined && !isValidStatus(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  if (
    (softSkills !== undefined && typeof softSkills !== "string") ||
    (skills !== undefined && typeof skills !== "string")
  ) {
    res.status(400).json({ error: "skills fields must be strings" });
    return;
  }

  const application = await createApplication({
    companyName,
    jobTitle,
    location,
    sourceUrl,
    status,
    applyTime,
    softSkills,
    skills
  });

  res.status(201).json({ data: application });
}

export async function listApplicationsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const status = req.query.status as ApplicationStatus | undefined;
  if (status !== undefined && !isValidStatus(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  if (
    (limit !== undefined && !Number.isFinite(limit)) ||
    (offset !== undefined && !Number.isFinite(offset))
  ) {
    res.status(400).json({ error: "Invalid pagination values" });
    return;
  }

  const applications = await listApplications({ status, limit, offset });
  res.json({ data: applications });
}

export async function getApplicationHandler(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseApplicationId(req, res);
  if (id === null) {
    return;
  }

  const application = await getApplicationById(id);
  if (!application) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.json({ data: application });
}

export async function updateApplicationHandler(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseApplicationId(req, res);
  if (id === null) {
    return;
  }

  const {
    companyName,
    jobTitle,
    location,
    sourceUrl,
    status,
    applyTime,
    softSkills,
    skills
  } = req.body ?? {};

  if (status !== undefined && !isValidStatus(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  if (
    (softSkills !== undefined && typeof softSkills !== "string") ||
    (skills !== undefined && typeof skills !== "string")
  ) {
    res.status(400).json({ error: "skills fields must be strings" });
    return;
  }

  const application = await updateApplication(id, {
    companyName,
    jobTitle,
    location,
    sourceUrl,
    status,
    applyTime,
    softSkills,
    skills
  });

  if (!application) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.json({ data: application });
}

export async function deleteApplicationHandler(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseApplicationId(req, res);
  if (id === null) {
    return;
  }

  const deleted = await deleteApplication(id);
  if (!deleted) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.status(204).send();
}
