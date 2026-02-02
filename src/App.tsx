import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Packer } from "docx";
import { renderAsync } from "docx-preview";
import { useEffect, useRef, useState } from "react";
import "./index.css";
import {
  buildResumeDocument,
  defaultResumeData,
  type ExperienceEntry,
  type ResumeData,
  type ResumeHeader,
} from "./lib/resumeDocx";

type ResumeJsonExperience = {
  company?: string;
  role?: string;
  period?: string;
  description?: string;
};

type ResumeJsonPayload = {
  employer?: string;
  header?: ResumeHeader;
  profile?: string;
  skills?: [string, string][];
  experience?: ResumeJsonExperience[];
  education?: {
    school?: string;
    degree?: string;
    period?: string;
    description?: string;
  }[];
};

const DEFAULT_EMPLOYER = "Quantum Detectors";
const DEFAULT_FIRECRAWL_PORT = "3002";

const resolveFirecrawlBaseUrl = () => "/api/firecrawl";

type FirecrawlCrawlStartResponse = {
  success?: boolean;
  id?: string;
  jobId?: string;
  url?: string;
};

type FirecrawlCrawlStatus = {
  status?: string;
  total?: number;
  completed?: number;
  current?: number;
  data?: Array<{
    markdown?: string;
    content?: string;
    metadata?: {
      title?: string;
      sourceURL?: string;
    };
  }>;
  partial_data?: FirecrawlCrawlStatus["data"];
  next?: string | null;
  error?: string;
  message?: string;
};

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    content?: string;
    metadata?: {
      title?: string;
      sourceURL?: string;
    };
  };
  markdown?: string;
  content?: string;
  metadata?: {
    title?: string;
    sourceURL?: string;
  };
  error?: string;
  message?: string;
};

const buildJsonFromData = (data: ResumeData): ResumeJsonPayload => ({
  header: data.header,
  profile: data.personalProfile,
  skills: data.technicalSkills.map((skill) => [skill.label, skill.value]),
  experience: data.experience.map((entry) => ({
    company: entry.company,
    role: entry.role,
    period: entry.dateRange,
    description: entry.bullets.map((bullet) => `- ${bullet}`).join("\n"),
  })),
  education: data.education.map((entry) => ({
    school: entry.school,
    degree: entry.degree,
    period: entry.dateRange,
    description: entry.bullets.map((bullet) => `- ${bullet}`).join("\n"),
  })),
});

const parseDescription = (value: string) =>
  value
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter((line) => line.length > 0);

const normalizeExperience = (entries: ResumeJsonExperience[], fallback: ExperienceEntry[]): ExperienceEntry[] =>
  entries.length > 0
    ? entries.map((entry) => ({
        company: entry.company?.trim() ?? "",
        role: entry.role?.trim() ?? "",
        dateRange: entry.period?.trim() ?? "",
        bullets: parseDescription(entry.description ?? ""),
      }))
    : fallback;

const normalizeSkills = (skills: [string, string][], fallback: ResumeData["technicalSkills"]) =>
  skills.length > 0
    ? skills.map(([label, value]) => ({
        label: String(label ?? "").trim(),
        value: String(value ?? "").trim(),
      }))
    : fallback;

const normalizeEducation = (entries: ResumeJsonPayload["education"], fallback: ResumeData["education"]) =>
  Array.isArray(entries) && entries.length > 0
    ? entries.map((entry) => ({
        school: entry.school?.trim() ?? "",
        degree: entry.degree?.trim() ?? "",
        dateRange: entry.period?.trim() ?? "",
        bullets: parseDescription(entry.description ?? ""),
      }))
    : fallback;

export function App() {
  const initialJson = JSON.stringify(
    { ...buildJsonFromData(defaultResumeData), employer: DEFAULT_EMPLOYER },
    null,
    2
  );
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);
  const [jsonInput, setJsonInput] = useState(initialJson);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [companyName, setCompanyName] = useState(DEFAULT_EMPLOYER);
  const [jdUrl, setJdUrl] = useState("");
  const [scrapedText, setScrapedText] = useState("");
  const [crawlStatus, setCrawlStatus] = useState("");
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/resume.json")
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (!active || !text) return;
        setJsonInput(text);
      })
      .catch(() => {
        // fallback to the default template in the app bundle
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const payload = JSON.parse(jsonInput) as ResumeJsonPayload;
      setResumeData((prev) => {
        const profileValue =
          typeof payload.profile === "string" && payload.profile.trim().length > 0
            ? payload.profile.trim()
            : prev.personalProfile;
        const skills = normalizeSkills(Array.isArray(payload.skills) ? payload.skills : [], prev.technicalSkills);
        const experience = normalizeExperience(Array.isArray(payload.experience) ? payload.experience : [], prev.experience);
        const education = normalizeEducation(payload.education, prev.education);
        const header = payload.header ?? prev.header;

        return {
          header,
          personalProfile: profileValue,
          technicalSkills: skills,
          experience,
          education,
        };
      });
      setCompanyName(typeof payload.employer === "string" ? payload.employer : "");
      setParseError(null);
    } catch (error) {
      setParseError("Invalid JSON. Please fix the input to refresh the preview.");
    }
  }, [jsonInput]);

  useEffect(() => {
    let active = true;
    const doc = buildResumeDocument(resumeData);
    Packer.toBlob(doc).then((blob) => {
      if (!active) return;
      setPreviewBlob(blob);
    });
    return () => {
      active = false;
    };
  }, [resumeData]);

  useEffect(() => {
    if (!previewBlob || !previewRef.current) return;
    let active = true;
    previewRef.current.innerHTML = "";
    renderAsync(previewBlob, previewRef.current, undefined, { inWrapper: false }).catch(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [previewBlob]);

  const handleDownload = async () => {
    const doc = buildResumeDocument(resumeData);
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const trimmedCompanyName = companyName.trim();
    anchor.download = trimmedCompanyName ? `${trimmedCompanyName} - Resume.docx` : "Resume.docx";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyScrapedText = async () => {
    if (!scrapedText.trim()) return;
    try {
      await navigator.clipboard.writeText(scrapedText);
    } catch (error) {
      // Ignore clipboard errors; user can still select manually.
    }
  };

  const buildCrawlRequestBody = (url: string) => ({
    url,
    limit: 1,
    sitemap: "skip",
    maxDiscoveryDepth: 0,
    scrapeOptions: {
      formats: ["markdown"],
      onlyMainContent: true,
    },
  });

  const buildScrapeRequestBody = (url: string) => ({
    url,
    formats: ["markdown"],
    onlyMainContent: true,
  });

  const collectCrawlText = (payload: FirecrawlCrawlStatus) => {
    const pages = Array.isArray(payload.data) && payload.data.length > 0 ? payload.data : payload.partial_data ?? [];
    return pages
      .map((page) => {
        const markdown = typeof page.markdown === "string" ? page.markdown.trim() : "";
        const content = typeof page.content === "string" ? page.content.trim() : "";
        const title = page.metadata?.title?.trim();
        const source = page.metadata?.sourceURL?.trim();
        const header = [title ? `# ${title}` : "", source ? `Source: ${source}` : ""].filter(Boolean).join("\n");
        const body = markdown || content;
        return [header, body].filter(Boolean).join("\n\n").trim();
      })
      .filter((text) => text.length > 0)
      .join("\n\n---\n\n");
  };

  const extractScrapeText = (payload: FirecrawlScrapeResponse) => {
    const markdown = payload.data?.markdown ?? payload.markdown;
    const content = payload.data?.content ?? payload.content;
    const title = payload.data?.metadata?.title ?? payload.metadata?.title;
    const source = payload.data?.metadata?.sourceURL ?? payload.metadata?.sourceURL;
    const header = [title ? `# ${title}` : "", source ? `Source: ${source}` : ""].filter(Boolean).join("\n");
    const body = (markdown ?? content ?? "").trim();
    return [header, body].filter(Boolean).join("\n\n").trim();
  };

const describeResponseFailure = async (response: Response, fallback: string) => {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const payload = JSON.parse(text) as { error?: string; message?: string };
    return payload.error || payload.message || text;
  } catch (error) {
    return text;
  }
};

const formatNetworkError = (error: unknown, url: string) => {
  const fallback = `Network error calling ${url}. Check that Firecrawl is reachable and CORS is allowed.`;
  if (error instanceof Error) {
    const message = error.message.trim();
    return message ? `${fallback}\n\nDetails: ${message}` : fallback;
  }
  return fallback;
};

const formatCrawlFailure = (payload: FirecrawlCrawlStatus) => {
  const summary = payload.error || payload.message || "Firecrawl crawl failed.";
  const details = {
    status: payload.status,
    error: payload.error,
    message: payload.message,
    total: payload.total,
    completed: payload.completed,
    next: payload.next,
  };
  return `${summary}\n\nDetails:\n${JSON.stringify(details, null, 2)}`;
};

  const startCrawlJob = async (url: string, baseUrl: string) => {
    const requestBody = buildCrawlRequestBody(url);
    const tryVersions: Array<"v2" | "v1"> = ["v2", "v1"];

    for (const version of tryVersions) {
      const url = `${baseUrl}/${version}/crawl`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
      } catch (error) {
        throw new Error(formatNetworkError(error, url));
      }

      if (!response.ok) {
        if (response.status === 404) {
          continue;
        }
        const fallback = `Firecrawl crawl request failed (${response.status}).`;
        const message = await describeResponseFailure(response, fallback);
        throw new Error(message);
      }

      const payload = (await response.json()) as FirecrawlCrawlStartResponse;
      const id = payload.id ?? payload.jobId;
      if (!id) {
        throw new Error("Firecrawl did not return a crawl job id.");
      }
      return { id, version };
    }

    throw new Error("Firecrawl crawl endpoint not found. Is the container running on port 3002?");
  };

  const scrapeSingleUrl = async (url: string, baseUrl: string) => {
    const requestBody = buildScrapeRequestBody(url);
    const tryVersions: Array<"v2" | "v1"> = ["v2", "v1"];

    for (const version of tryVersions) {
      const url = `${baseUrl}/${version}/scrape`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
      } catch (error) {
        throw new Error(formatNetworkError(error, url));
      }

      if (!response.ok) {
        if (response.status === 404) {
          continue;
        }
        const fallback = `Firecrawl scrape request failed (${response.status}).`;
        const message = await describeResponseFailure(response, fallback);
        throw new Error(message);
      }

      const payload = (await response.json()) as FirecrawlScrapeResponse;
      const text = extractScrapeText(payload);
      if (!text) {
        throw new Error(payload.error || payload.message || "Scrape finished, but no content was returned.");
      }
      return text;
    }

    throw new Error("Firecrawl scrape endpoint not found. Is the container running on port 3002?");
  };

  const pollCrawlStatus = async (id: string, version: "v2" | "v1", baseUrl: string) => {
    const startTime = Date.now();
    const timeoutMs = 60_000;
    let lastText = "";

    while (Date.now() - startTime < timeoutMs) {
      const statusUrl =
        version === "v2" ? `${baseUrl}/v2/crawl/${id}` : `${baseUrl}/v1/crawl/status/${id}`;
      let response: Response;
      try {
        response = await fetch(statusUrl);
      } catch (error) {
        throw new Error(formatNetworkError(error, statusUrl));
      }
      if (!response.ok) {
      const fallback = `Firecrawl crawl status failed (${response.status}).`;
      const message = await describeResponseFailure(response, fallback);
      throw new Error(message);
      }

      const payload = (await response.json()) as FirecrawlCrawlStatus;
      const status = payload.status ?? "scraping";
      const total = payload.total ?? payload.current ?? 0;
      const completed = payload.completed ?? payload.current ?? 0;
      setCrawlStatus(
        status === "completed"
          ? "Crawl complete."
          : `Crawling... ${completed}${total ? ` / ${total}` : ""}`
      );

      const text = collectCrawlText(payload);
      if (text) {
        lastText = text;
      }

      if (status === "completed") {
        return lastText;
      }
      if (status === "failed") {
      throw new Error(formatCrawlFailure(payload));
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (lastText) return lastText;
    throw new Error("Crawl timed out. Try again or reduce the crawl limit.");
  };

  const handleCrawl = async () => {
    const trimmedUrl = jdUrl.trim();
    if (!trimmedUrl) return;
    try {
      new URL(trimmedUrl);
    } catch (error) {
      setCrawlError("Please enter a valid URL.");
      return;
    }

    setIsCrawling(true);
    setCrawlError(null);
    setCrawlStatus("Starting crawl...");
    setScrapedText("");

    try {
      const baseUrl = resolveFirecrawlBaseUrl();
      const { id, version } = await startCrawlJob(trimmedUrl, baseUrl);
      const text = await pollCrawlStatus(id, version, baseUrl);
      if (text) {
        setScrapedText(text);
        return;
      }

      setCrawlStatus("Crawl empty. Trying direct scrape...");
      const scraped = await scrapeSingleUrl(trimmedUrl, baseUrl);
      setScrapedText(scraped);
    } catch (error) {
      setCrawlError(error instanceof Error ? error.message : "Crawl failed.");
    } finally {
      setIsCrawling(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">CV Generator</p>
            <h1 className="text-2xl font-semibold text-foreground">My Resume</h1>
          </div>
          <Button onClick={handleDownload}>Download DOCX</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(320px,1fr)_minmax(520px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Scraping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jd-url">Job description URL</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="jd-url"
                    placeholder="https://company.com/job-description"
                    value={jdUrl}
                    onChange={(event) => setJdUrl(event.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={handleCrawl} disabled={!jdUrl.trim() || isCrawling}>
                    {isCrawling ? "Crawling..." : "Crawl"}
                  </Button>
                </div>
              </div>
              {crawlStatus ? <p className="text-sm text-muted-foreground">{crawlStatus}</p> : null}
              {crawlError ? (
                <p className="text-sm text-destructive whitespace-pre-wrap">{crawlError}</p>
              ) : null}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="scraped-text">Crawled text</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyScrapedText}
                    disabled={!scrapedText.trim()}
                  >
                    Copy
                  </Button>
                </div>
                <Textarea
                  id="scraped-text"
                  rows={8}
                  placeholder="Crawled text will appear here."
                  value={scrapedText}
                  onChange={(event) => setScrapedText(event.target.value)}
                  className="h-60"
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Resume JSON</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="resume-json">Paste JSON (markdown supported in profile + bullets)</Label>
                <Textarea
                  id="resume-json"
                  rows={24}
                  value={jsonInput}
                  onChange={(event) => setJsonInput(event.target.value)}
                  className="h-96 font-mono"
                />
              </div>
              {parseError ? <p className="text-sm text-destructive">{parseError}</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>DOCX Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[calc(100vh-220px)] overflow-auto rounded-lg border bg-white p-4 shadow-sm">
              <div ref={previewRef} className="docx-preview" />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default App;
