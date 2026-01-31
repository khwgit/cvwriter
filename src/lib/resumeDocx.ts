import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  HeightRule,
  type IRunOptions,
  LevelFormat,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} from "docx";

export type TechnicalSkill = {
  label: string;
  value: string;
};

export type ExperienceEntry = {
  company: string;
  role: string;
  dateRange: string;
  bullets: string[];
};

export type EducationEntry = {
  school: string;
  degree: string;
  dateRange: string;
  bullets: string[];
};

export type ResumeHeader = {
  fullName: string;
  location: string;
  phone: string;
  email: string;
  linkedinLabel: string;
  linkedinUrl: string;
  githubLabel: string;
  githubUrl: string;
};

export type ResumeData = {
  header: ResumeHeader;
  personalProfile: string;
  personalProfileHighlight: string;
  technicalSkills: TechnicalSkill[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
};

export const defaultResumeData: ResumeData = {
  header: {
    fullName: "Your Name",
    location: "City, Country",
    phone: "+1 555 123 4567",
    email: "you@example.com",
    linkedinLabel: "linkedin.com/in/your-handle",
    linkedinUrl: "https://linkedin.com/in/your-handle",
    githubLabel: "github.com/your-handle",
    githubUrl: "https://github.com/your-handle",
  },
  personalProfile:
    "Briefly describe your experience and the kind of impact you want to make. Keep it concise and tailored to the role.",
  personalProfileHighlight: "Open to opportunities.",
  technicalSkills: [
    { label: "Core Languages:", value: "TypeScript, JavaScript, Python" },
    { label: "OS/Tools:", value: "Linux, macOS, Git, Docker" },
    { label: "Frameworks:", value: "React, Node.js, Bun" },
    { label: "Cloud/Database:", value: "PostgreSQL, Redis, AWS" },
    { label: "Methodologies:", value: "Agile (Scrum), CI/CD" },
  ],
  experience: [
    {
      company: "Company Name",
      role: "Role Title",
      dateRange: "MONTH YEAR - MONTH YEAR",
      bullets: [
        "Built and maintained key product features that improved user engagement and retention.",
        "Collaborated with cross-functional teams to deliver projects on time.",
        "Optimized critical workflows, reducing latency and operational costs.",
      ],
    },
    {
      company: "Another Company",
      role: "Senior Engineer",
      dateRange: "MONTH YEAR - MONTH YEAR",
      bullets: [
        "Led system design efforts for scalable services handling high traffic.",
        "Improved developer productivity with automation and tooling upgrades.",
      ],
    },
    {
      company: "Freelance / Consulting",
      role: "Software Developer",
      dateRange: "MONTH YEAR - PRESENT",
      bullets: [
        "Delivered bespoke solutions for clients across multiple industries.",
      ],
    },
  ],
  education: [
    {
      school: "University Name",
      degree: "Bachelor of Science in Computer Science",
      dateRange: "MONTH YEAR - MONTH YEAR",
      bullets: ["Honors / GPA", "Scholarships or awards"],
    },
  ],
};

const FONT_NAME = "Proxima Nova";
const TITLE_COLOR = "353744";
const SECTION_TITLE_COLOR = "3C77C1";
const LINK_COLOR = "1155cc";
const MUTED_COLOR = "666666";
const BODY_COLOR = "000000";
const PAGE_WIDTH = 11906;
const PAGE_MARGIN = 430;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const headingRun = (text: string) =>
  new TextRun({
    text,
    font: FONT_NAME,
    size: 26,
    color: SECTION_TITLE_COLOR,
    bold: true,
  });

const bodyRun = (text: string, overrides: Partial<IRunOptions> = {}) =>
  new TextRun({
    text,
    font: FONT_NAME,
    size: 22,
    color: BODY_COLOR,
    ...overrides,
  });

const headerLabelRun = (text: string) =>
  new TextRun({
    text,
    size: 22,
    color: MUTED_COLOR,
  });

const sectionHeading = (text: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 160, after: 40, line: 240 },
    children: [headingRun(text)],
  });

const hyperlinkRun = (text: string, link: string) =>
  new ExternalHyperlink({
    link,
    children: [
      new TextRun({
        text,
        font: FONT_NAME,
        size: 22,
        color: LINK_COLOR,
        underline: { type: UnderlineType.SINGLE },
      }),
    ],
  });

const markdownRuns = (text: string, base: IRunOptions) => {
  const runs: TextRun[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match = boldPattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      if (plainText.length > 0) {
        runs.push(new TextRun({ text: plainText, ...base }));
      }
    }

    const boldText = match[1] ?? "";
    if (boldText.length > 0) {
      runs.push(new TextRun({ text: boldText, ...base, bold: true }));
    }

    lastIndex = match.index + match[0].length;
    match = boldPattern.exec(text);
  }

  if (lastIndex < text.length) {
    const tailText = text.slice(lastIndex);
    if (tailText.length > 0) {
      runs.push(new TextRun({ text: tailText, ...base }));
    }
  }

  return runs;
};

const buildTechnicalSkillsTable = (rows: TechnicalSkill[]) => {
  const cellBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: rows.map(
      (row) =>
        new TableRow({
          height: { value: 331, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 1770, type: WidthType.DXA },
              borders: cellBorders,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({
                  spacing: { before: 0 },
                  alignment: AlignmentType.LEFT,
                  children: markdownRuns(row.label, {
                    font: FONT_NAME,
                    size: 22,
                    color: TITLE_COLOR,
                  }),
                }),
              ],
            }),
            new TableCell({
              width: { size: 9390, type: WidthType.DXA },
              borders: cellBorders,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({
                  spacing: { before: 0 },
                  alignment: AlignmentType.LEFT,
                  children: markdownRuns(row.value, {
                    font: FONT_NAME,
                    size: 22,
                    color: BODY_COLOR,
                  }),
                }),
              ],
            }),
          ],
        })
    ),
  });
};

const bulletParagraph = (text: string) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 40, line: 240 },
    numbering: { reference: "resume-bullets", level: 0 },
    children: [bodyRun(text)],
  });

export const buildResumeDocument = (data: ResumeData) => {
  const numbering = {
    config: [
      {
        reference: "resume-bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 425, hanging: 300 },
              },
            },
          },
        ],
      },
    ],
  };

  const experienceBlocks = data.experience.flatMap((entry, index) => {
    const showRole = entry.role.trim().length > 0;
    const titleRuns = [
      new TextRun({
        text: entry.company,
        font: FONT_NAME,
        color: TITLE_COLOR,
        size: 22,
        bold: true,
        italics: false,
      }),
    ];

    if (showRole) {
      titleRuns.push(
        new TextRun({
          text: " - ",
          font: FONT_NAME,
          color: MUTED_COLOR,
          size: 22,
          italics: true,
        }),
        new TextRun({
          text: entry.role,
          font: FONT_NAME,
          color: MUTED_COLOR,
          size: 22,
          italics: true,
        })
      );
    }

    const bullets = entry.bullets.map((bullet) => bulletParagraph(bullet));
    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 40 },
        children: titleRuns,
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 20, line: 240 },
        children: [
          new TextRun({
            text: entry.dateRange,
            font: FONT_NAME,
            size: 20,
            color: MUTED_COLOR,
            italics: false,
          }),
        ],
      }),
      ...bullets,
    ];
  });

  const educationBlocks = data.education.flatMap((entry, index) => {
    const bullets = entry.bullets.map((bullet) => bulletParagraph(bullet));
    return [
      ...(index === 0 ? [] : [new Paragraph({ text: "", spacing: { before: 20 } })]),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 40 },
        children: [
          new TextRun({
            text: `${entry.school} `,
            font: FONT_NAME,
            color: TITLE_COLOR,
            size: 22,
            bold: true,
            italics: false,
          }),
          new TextRun({
            text: `- ${entry.degree}`,
            font: FONT_NAME,
            color: MUTED_COLOR,
            size: 22,
            italics: true,
          }),
        ],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 20, line: 240 },
        children: [
          new TextRun({
            text: entry.dateRange,
            font: FONT_NAME,
            size: 20,
            color: MUTED_COLOR,
            italics: false,
          }),
        ],
      }),
      ...bullets,
    ];
  });

  return new Document({
    numbering,
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 16838 },
            margin: {
              top: PAGE_MARGIN,
              bottom: 0,
              left: PAGE_MARGIN,
              right: PAGE_MARGIN,
            },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: 0 },
            children: [
              new TextRun({
                text: data.header.fullName,
                size: 40,
                color: TITLE_COLOR,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, line: 240 },
            children: [
              headerLabelRun(
                `${data.header.location} | ${data.header.phone} | `
              ),
              hyperlinkRun(data.header.email, `mailto:${data.header.email}`),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, line: 240 },
            children: [
              headerLabelRun("LinkedIn: "),
              hyperlinkRun(data.header.linkedinLabel, data.header.linkedinUrl),
              headerLabelRun(" | GitHub: "),
              hyperlinkRun(data.header.githubLabel, data.header.githubUrl),
            ],
          }),
          sectionHeading("PERSONAL PROFILE"),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 40, line: 240 },
            children: [
              bodyRun(`${data.personalProfile} `),
              bodyRun(data.personalProfileHighlight, { bold: true }),
            ],
          }),
          sectionHeading("TECHNICAL SKILLS"),
          buildTechnicalSkillsTable(data.technicalSkills),
          sectionHeading("EXPERIENCE"),
          ...experienceBlocks,
          sectionHeading("EDUCATION"),
          ...educationBlocks,
        ],
      },
    ],
  });
};
