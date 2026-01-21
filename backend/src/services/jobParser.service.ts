export interface JobParseResult {
  company?: string;
  title?: string;
}

export function normalizeJobData(data: JobParseResult): JobParseResult {
  return {
    company: data.company?.trim(),
    title: data.title?.trim()
  };
}