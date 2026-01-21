import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";

type ApplicationStatus = "applied" | "interview" | "rejected" | "closed";

interface Application {
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

const statusStyles: Record<ApplicationStatus, string> = {
  applied: "bg-amber-100 text-amber-800",
  interview: "bg-sky-100 text-sky-800",
  rejected: "bg-rose-100 text-rose-800",
  closed: "bg-slate-200 text-slate-700"
};

const statusOptions: ApplicationStatus[] = [
  "applied",
  "interview",
  "rejected",
  "closed"
];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"
});

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function App() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importUrl, setImportUrl] = useState("");
  const [importStatus, setImportStatus] =
    useState<ApplicationStatus>("applied");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/applications");
      setApplications(response.data?.data ?? []);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to load applications";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesStatus =
        statusFilter === "all" ? true : app.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const haystack = [
        app.companyName,
        app.jobTitle ?? "",
        app.location ?? ""
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [applications, search, statusFilter]);

  const statusCounts = useMemo(() => {
    return applications.reduce<Record<ApplicationStatus, number>>(
      (acc, app) => {
        acc[app.status] += 1;
        return acc;
      },
      { applied: 0, interview: 0, rejected: 0, closed: 0 }
    );
  }, [applications]);

  const handleImport = async (event: FormEvent) => {
    event.preventDefault();
    if (!importUrl.trim()) {
      setImportError("Please enter a job link.");
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      const response = await api.post("/applications/import", {
        url: importUrl.trim(),
        status: importStatus
      });
      setApplications((prev) => [response.data.data, ...prev]);
      setImportUrl("");
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Import failed. Check the API and URL.";
      setImportError(message);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 text-slate-900 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 p-8 shadow-xl backdrop-blur">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-12 translate-x-12 rounded-full bg-orange-200/60 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-36 w-36 -translate-x-16 translate-y-12 rounded-full bg-sky-200/70 blur-2xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Job Pipeline
              </p>
              <h1 className="font-display text-3xl font-semibold text-slate-900 md:text-4xl">
                Track every application. Import from links in seconds.
              </h1>
              <p className="mt-2 max-w-2xl text-base text-slate-600">
                Use Gemini-backed parsing to pull structured data from job
                pages, then search and triage your pipeline.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={refresh}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                Refresh
              </button>
              <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                {applications.length} total
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
            <div className="flex items-center">
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Application List
              </h2>
            </div>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Search
                </label>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Company, role, location..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div className="min-w-[180px]">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="all">All</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {statusOptions.map((status) => (
                <div
                  key={status}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {status}
                  </p>
                  <p className="font-display text-2xl font-semibold text-slate-900">
                    {statusCounts[status]}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {loading && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500">
                  Loading applications...
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {!loading && !filtered.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500">
                  No applications match this filter.
                </div>
              )}
              {filtered.map((app) => (
                <article
                  key={app.id}
                  className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {app.location || "Remote"}
                      </p>
                      <h3 className="font-display text-xl font-semibold text-slate-900">
                        {app.companyName}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {app.jobTitle || "Role not specified"}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[app.status]}`}
                      >
                        {app.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Applied: {formatDate(app.applyTime)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Created: {formatDate(app.createTime)}</span>
                    <span>Updated: {formatDate(app.updateTime)}</span>
                    {app.sourceUrl && (
                      <a
                        className="ml-auto text-xs font-semibold text-orange-600 hover:text-orange-700"
                        href={app.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open source
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/60 bg-slate-900 p-6 text-white shadow-xl">
              <h2 className="font-display text-2xl font-semibold">
                Import from a Job Link
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Paste a URL, pick a status, and let Gemini parse the page into a
                structured application.
              </p>
              <form onSubmit={handleImport} className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Job Link
                  </label>
                  <input
                    value={importUrl}
                    onChange={(event) => setImportUrl(event.target.value)}
                    placeholder="https://..."
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Status
                  </label>
                  <select
                    value={importStatus}
                    onChange={(event) =>
                      setImportStatus(event.target.value as ApplicationStatus)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                {importError && (
                  <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {importError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={importLoading}
                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {importLoading ? "Importing..." : "Import Job"}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Search Tips
              </h3>
              <ul className="mt-3 space-y-3 text-sm text-slate-600">
                <li>
                  Use company names or locations for quick filtering. The list
                  updates instantly.
                </li>
                <li>
                  Sync status with your pipeline to keep interview tracking
                  accurate.
                </li>
                <li>
                  Import in batches, then review the entries for any missing
                  fields.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
