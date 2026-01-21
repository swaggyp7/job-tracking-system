import { initDatabase } from "../db/database";

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
    existingMap.set(name, result.lastID);
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
  await syncApplicationSkills(result.lastID, softSkillNames, 1);
  await syncApplicationSkills(result.lastID, requiredSkillNames, 0);

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
  return result.changes > 0;
}
