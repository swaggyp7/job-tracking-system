import { initDatabase } from "../db/database";
import { getGeminiModel } from "./gemini.service";

export type ApplicationStatus = "applied" | "interview" | "rejected" | "closed";

export interface Application {
  id: number;
  companyName: string;
  jobTitle: string | null;
  location: string | null;
  sourceUrl: string | null;
  status: ApplicationStatus;
  applyTime: string | null;
  createTime: string;
  updateTime: string;
}

export interface CreateApplicationInput {
  companyName: string;
  jobTitle?: string | null;
  location?: string | null;
  sourceUrl?: string | null;
  status?: ApplicationStatus;
  applyTime?: string | null;
  softSkills?: string | null;
  skills?: string | null;
}

export interface UpdateApplicationInput {
  companyName?: string;
  jobTitle?: string | null;
  location?: string | null;
  sourceUrl?: string | null;
  status?: ApplicationStatus;
  applyTime?: string | null;
  softSkills?: string | null;
  skills?: string | null;
}

export interface ListApplicationsQuery {
  status?: ApplicationStatus;
  limit?: number;
  offset?: number;
}

export interface ImportApplicationInput {
  url: string;
  status?: ApplicationStatus;
}

function mapRowToApplication(row: any): Application {
  return {
    id: row.id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    location: row.location,
    sourceUrl: row.source_url,
    status: row.status,
    applyTime: row.apply_time,
    createTime: row.create_time,
    updateTime: row.update_time
  };
}

function parseSkillList(value?: string | null): string[] {
  if (!value) {
    return [];
  }
  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return Array.from(new Set(parts));
}

async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch url: ${response.status}`);
  }
  const html = await response.text();
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts.replace(/<[^>]*>/g, " ");
  return text.replace(/\s+/g, " ").trim().slice(0, 12000);
}

function parseGeminiJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response did not contain JSON");
  }
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

async function analyzeJobContent(
  url: string,
  pageText: string
): Promise<CreateApplicationInput> {
  const model = getGeminiModel();
  const prompt = [
    "Extract job application data from the content below.",
    "Return JSON only with keys:",
    "companyName, jobTitle, location, sourceUrl, status, applyTime, softSkills, skills.",
    "softSkills and skills must be comma-separated strings.",
    "If a value is missing, return null.",
    `Use sourceUrl = "${url}".`,
    "",
    "Content:",
    pageText
  ].join("\n");

  const result = await model.generateContent(prompt);
  const payload = parseGeminiJson(result.response.text());

  return {
    companyName: (payload.companyName as string) ?? "",
    jobTitle: (payload.jobTitle as string) ?? null,
    location: (payload.location as string) ?? null,
    sourceUrl: (payload.sourceUrl as string) ?? url,
    status: (payload.status as ApplicationStatus) ?? "applied",
    applyTime: (payload.applyTime as string) ?? null,
    softSkills: (payload.softSkills as string) ?? null,
    skills: (payload.skills as string) ?? null
  };
}

async function getOrCreateSkills(
  names: string[],
  isSoftSkill: 0 | 1
): Promise<number[]> {
  const db = await initDatabase();
  if (names.length === 0) {
    return [];
  }

  const placeholders = names.map(() => "?").join(", ");
  const existingRows = await db.all(
    `SELECT id, name FROM skills WHERE name IN (${placeholders})`,
    names
  );
  const existingMap = new Map<string, number>();
  for (const row of existingRows) {
    existingMap.set(row.name, row.id);
  }

  const missing = names.filter((name) => !existingMap.has(name));
  for (const name of missing) {
    const result = await db.run(
      "INSERT INTO skills (name, is_soft_skill) VALUES (?, ?)",
      name,
      isSoftSkill
    );
    existingMap.set(name, result.lastID as number);
  }

  return names.map((name) => existingMap.get(name) as number);
}

async function syncApplicationSkills(
  applicationId: number,
  skillNames: string[] | undefined,
  isSoftSkill: 0 | 1
): Promise<void> {
  if (skillNames === undefined) {
    return;
  }

  const db = await initDatabase();
  await db.run(
    `DELETE FROM application_skill_set
     WHERE application_id = ?
       AND skill_id IN (
         SELECT id FROM skills WHERE is_soft_skill = ?
       )`,
    applicationId,
    isSoftSkill
  );

  if (skillNames.length === 0) {
    return;
  }

  const skillIds = await getOrCreateSkills(skillNames, isSoftSkill);
  for (const skillId of skillIds) {
    await db.run(
      `INSERT OR IGNORE INTO application_skill_set
        (application_id, skill_id)
       VALUES (?, ?)`,
      applicationId,
      skillId
    );
  }
}

export async function createApplication(
  input: CreateApplicationInput
): Promise<Application> {
  const db = await initDatabase();
  const result = await db.run(
    `INSERT INTO application
      (company_name, job_title, location, source_url, status, apply_time)
     VALUES
      (?, ?, ?, ?, ?, ?)`,
    input.companyName,
    input.jobTitle ?? null,
    input.location ?? null,
    input.sourceUrl ?? null,
    input.status ?? "applied",
    input.applyTime ?? null
  );

  const softSkillNames = parseSkillList(input.softSkills);
  const requiredSkillNames = parseSkillList(input.skills);
  await syncApplicationSkills(result.lastID as number, softSkillNames, 1);
  await syncApplicationSkills(result.lastID as number, requiredSkillNames, 0);

  const row = await db.get(
    "SELECT * FROM application WHERE id = ?",
    result.lastID
  );
  return mapRowToApplication(row);
}

export async function getApplicationById(
  id: number
): Promise<Application | null> {
  const db = await initDatabase();
  const row = await db.get("SELECT * FROM application WHERE id = ?", id);
  if (!row) {
    return null;
  }
  return mapRowToApplication(row);
}

export async function listApplications(
  query: ListApplicationsQuery = {}
): Promise<Application[]> {
  const db = await initDatabase();
  const filters: string[] = [];
  const params: Array<string | number> = [];

  if (query.status) {
    filters.push("status = ?");
    params.push(query.status);
  }

  let sql = "SELECT * FROM application";
  if (filters.length) {
    sql += ` WHERE ${filters.join(" AND ")}`;
  }
  sql += " ORDER BY create_time DESC";

  if (query.limit !== undefined) {
    sql += " LIMIT ?";
    params.push(query.limit);
  }
  if (query.offset !== undefined) {
    sql += " OFFSET ?";
    params.push(query.offset);
  }

  const rows = await db.all(sql, params);
  return rows.map(mapRowToApplication);
}

export async function updateApplication(
  id: number,
  input: UpdateApplicationInput
): Promise<Application | null> {
  const fields: string[] = [];
  const params: Array<string | number | null> = [];

  if (input.companyName !== undefined) {
    fields.push("company_name = ?");
    params.push(input.companyName);
  }
  if (input.jobTitle !== undefined) {
    fields.push("job_title = ?");
    params.push(input.jobTitle);
  }
  if (input.location !== undefined) {
    fields.push("location = ?");
    params.push(input.location);
  }
  if (input.sourceUrl !== undefined) {
    fields.push("source_url = ?");
    params.push(input.sourceUrl);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    params.push(input.status);
  }
  if (input.applyTime !== undefined) {
    fields.push("apply_time = ?");
    params.push(input.applyTime);
  }

  const softSkillNames =
    input.softSkills !== undefined ? parseSkillList(input.softSkills) : undefined;
  const requiredSkillNames =
    input.skills !== undefined ? parseSkillList(input.skills) : undefined;

  if (fields.length) {
    const db = await initDatabase();
    params.push(id);
    await db.run(
      `UPDATE application SET ${fields.join(", ")} WHERE id = ?`,
      params
    );
  }

  await syncApplicationSkills(id, softSkillNames, 1);
  await syncApplicationSkills(id, requiredSkillNames, 0);

  const updated = await getApplicationById(id);
  return updated;
}

export async function deleteApplication(id: number): Promise<boolean> {
  const db = await initDatabase();
  const result = await db.run("DELETE FROM application WHERE id = ?", id);
  return typeof result.changes === "number" && result.changes > 0;
}

export async function importApplicationFromLink(
  input: ImportApplicationInput
): Promise<Application> {
  const pageText = await fetchPageText(input.url);
  const analysis = await analyzeJobContent(input.url, pageText);
  if (!analysis.companyName) {
    throw new Error("Gemini analysis missing companyName");
  }
  return createApplication({
    ...analysis,
    status: input.status ?? analysis.status ?? "applied"
  });
}
