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

const markdownProfileFromData = (data: ResumeData) => {
  const highlight = data.personalProfileHighlight.trim();
  if (!highlight) return data.personalProfile;
  return `${data.personalProfile} **${highlight}**`;
};

const buildJsonFromData = (data: ResumeData): ResumeJsonPayload => ({
  header: data.header,
  profile: markdownProfileFromData(data),
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

const parseProfileMarkdown = (value: string) => {
  const match = value.match(/\*\*(.+?)\*\*/);
  if (!match) {
    return { text: value.trim(), highlight: "" };
  }
  const highlight = (match[1] ?? "").trim();
  const text = value.replace(match[0], "").replace(/\s+/g, " ").trim();
  return { text, highlight };
};

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
            ? payload.profile
            : markdownProfileFromData(prev);
        const profile = parseProfileMarkdown(profileValue);
        const skills = normalizeSkills(Array.isArray(payload.skills) ? payload.skills : [], prev.technicalSkills);
        const experience = normalizeExperience(Array.isArray(payload.experience) ? payload.experience : [], prev.experience);
        const education = normalizeEducation(payload.education, prev.education);
        const header = payload.header ?? prev.header;

        return {
          header,
          personalProfile: profile.text || prev.personalProfile,
          personalProfileHighlight: profile.highlight,
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

  const handleEmployerChange = (value: string) => {
    setCompanyName(value);
    try {
      const payload = JSON.parse(jsonInput) as ResumeJsonPayload;
      const updatedPayload = { ...payload, employer: value };
      setJsonInput(JSON.stringify(updatedPayload, null, 2));
    } catch (error) {
      // Preserve invalid JSON while still letting the employer input update.
    }
  };

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
              <CardTitle>Resume JSON</CardTitle>
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
                  <Button type="button" variant="outline" disabled>
                    Crawl
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Company name</Label>
                <Input
                  id="company-name"
                  placeholder="Company name for the file name"
                  value={companyName}
                  onChange={(event) => handleEmployerChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resume-json">Paste JSON (markdown supported in profile + bullets)</Label>
                <Textarea
                  id="resume-json"
                  rows={24}
                  value={jsonInput}
                  onChange={(event) => setJsonInput(event.target.value)}
                  className="font-mono"
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
