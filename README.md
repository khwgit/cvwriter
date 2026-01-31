# bun-react-tailwind-shadcn-template

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run for production:

```bash
bun start
```

## Docker

Development:

```bash
docker compose up --build
```

Production:

```bash
docker compose --profile prod up --build app-prod
```

## Firecrawl (self-hosted)

Start the app + Firecrawl stack:

```bash
docker compose up --build
```

Test the crawl endpoint:

```bash
curl -X POST http://localhost:3002/v1/crawl \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://firecrawl.dev"}'
```

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
