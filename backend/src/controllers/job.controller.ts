import { Request, Response } from "express";
import { normalizeJobData } from "../services/jobParser.service";

export function normalizeJob(req: Request, res: Response): void {
  const { company, title } = req.body ?? {};
  const normalized = normalizeJobData({ company, title });
  res.json({ data: normalized });
}
