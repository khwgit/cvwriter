import { serve } from "bun";
import index from "./index.html";

const appPort = Number(process.env.APP_PORT ?? 3000);
const appHostname = process.env.APP_HOST ?? "0.0.0.0";

const server = serve({
  port: appPort,
  hostname: appHostname,
  routes: {
    "/resume.json": async () => {
      const file = Bun.file("resume.json");
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }
      return new Response("resume.json not found", { status: 404 });
    },
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
