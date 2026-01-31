# cvwriter

AI-assisted resume customization is popular, and I built this tool to explore that workflow while practicing React and understanding the differences between Flutter and React app development. It is a learning-focused project that also demonstrates front-end UI composition, client-side document generation, and integration with external services.

## Architecture

- `src/index.ts`: Bun server that serves the React app, hot reload in dev, and an optional `resume.json` payload.
- `src/App.tsx`: Main React UI for editing resume data, previewing, and exporting `.docx`.
- `src/lib/resumeDocx.ts`: Document builder using `docx` for layout and content.
- `src/components/ui/*`: shadcn/Radix UI components and inputs.
- `docx-preview`: Renders the generated `.docx` in the browser for quick preview.
- `docker-compose.yml`: Optional Firecrawl stack used to scrape job descriptions for tailoring prompts.

## Setup

### Prerequisites

- [Bun](https://bun.com) v1.x
- Docker (optional, only for Firecrawl)

### Docker

Development (app + Firecrawl stack):

```bash
cp .env.firecrawl.example .env.firecrawl
docker compose up --build
```

Open `http://localhost:3000`.

## TODO

- Better integration with Google Drive (auto upload on generation)
- Track application status in the UI
- Add an MCP server for more flexible workflows
