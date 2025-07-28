# OpenCode Coding Agent Guideline for instapoc

## Build/Lint/Test Commands:
- Build: Not required (Node.js project, Vercel `/api` directory for endpoints).
- Lint: No linter configured. Install eslint for consistent JS style.
- Test: No tests present. Recommend adding jest or similar for coverage.
- To run locally: `vercel dev`
- To test single endpoint: `curl localhost:3000/api/webhook`

## Code Style Guidelines:
- Use CommonJS (`require`), and place all imports at the top.
- Use environment variables with `process.env.*` for secrets.
- 2-tab indentation, always use semicolons, double quotes.
- camelCase for variables/functions, ALL_CAPS for env/config.
- Prefer async/await; always log and respond on errors.
- Never hardcode secrets or keys; read from env.
- No `app.listen`, export functions as module for Vercel API routes.
- Only write to `/tmp` for temp files in Vercel serverless functions.
- No Cursor or Copilot rules found. Update this file if you introduce them.
