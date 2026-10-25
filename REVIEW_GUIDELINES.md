# PR Review Guidelines (owner's rules)

BeeBark is a professional network: a Node/Express + Mongoose API in `backend/` and a React (CRA + craco, Tailwind, Radix UI) app in `frontend/`. Production runs on EC2 with S3, Lambda and SES; images go through Cloudinary and an AI safety check.

## Must flag (request changes)
- Bugs, broken logic, unhandled errors / null cases
- Security: hardcoded secrets, API keys, SQL injection, unsafe input handling
- console.log / print / debug code left in
- Commented-out dead code
- New features or bug fixes without tests (if the repo has tests)
- Breaking changes to public APIs without mention in PR description
- Functions longer than ~60 lines that should be split

## Backend (Express / Mongoose)
- Every route that reads or changes a user's data uses the `auth` middleware (`backend/middleware/auth.js`). Public routes (e.g. `/open/:username`) must be deliberate and return only public fields.
- Check ownership/permission, not just login: a user may only edit their own profile, posts, jobs, etc.; company page actions go through the page-admin check (`isAdmin` from `routes/company.js`).
- Never send password hashes, tokens, OTPs, emails/phones of other users, or internal fields to the client. Use `.select(...)` / explicit response shapes.
- Validate and clamp all input from `req.body`/`req.query`/`req.params` (see the `clip`/`pick` helpers in `routes/job.js`): allowed enum values, max lengths, max array sizes. No raw user input passed into Mongo queries (`$where`, operator injection via objects, unescaped regex from user text).
- Invalid ObjectIds must be handled (400/404), not crash into a 500.
- Every `async` route handler has try/catch and responds with `res.status(...).json({ error: '...' })` — the existing error shape. Log failures with `console.error`, not `console.log`.
- Expensive or abusable endpoints (AI calls, uploads, OTP/email sending, sign-in) need a limiter from `middleware/rateLimit.js`.
- AI calls go through `utils/groqClient.js` (or the existing Gemini/Rekognition helpers), with a timeout and a sensible fallback when the model fails or returns bad JSON.
- Uploaded files: check type and size before processing; images must still pass `utils/imageModeration.js`. Don't leave temp files behind.
- New config goes in environment variables and is added to `backend/.env.example`. No new hardcoded fallback secrets.
- Mongoose schema changes: think about existing documents (defaults, backfill script in `backend/scripts/` if needed) and add indexes for new query patterns.

## Frontend (React)
- API calls use `axios` with `API_URL` from `src/config/api.js` — no hardcoded backend URLs.
- Handle loading, empty and error states; show a user-friendly message instead of failing silently.
- Reuse existing components (`src/components/ui/*`, pickers, `ImageUpload`, `BeeLoader`, `Skeletons`) rather than building a duplicate.
- Hooks: correct dependency arrays, cleanup for intervals/listeners/sockets, no state updates after unmount.
- No `dangerouslySetInnerHTML` with user content. User-provided links are validated before rendering.
- Layout must work on mobile widths.
- Never put secrets in frontend code or `REACT_APP_*` variables (they ship to the browser).

## Naming & style
- Use clear, descriptive names (no `data1`, `temp`, `x`)
- Follow the existing folder structure and patterns in the repo: routes in `backend/routes/`, shared logic in `backend/utils/`, models in `backend/models/`, pages in `frontend/src/pages/`, components in `frontend/src/components/`
- Use async/await, not `.then()` chains, in new code
- CommonJS (`require`) in the backend, ES modules (`import`) in the frontend

## Ignore (don't comment on)
- Pure formatting (the formatter handles it)
- Personal preference nitpicks
- The "missing tests" rule: the repo has no automated test suite yet, so don't request tests unless the PR adds a test setup

## My custom rules
- Never commit `.env` files, real credentials, or data exports (spreadsheets, user dumps) — only `.env.example`
- User-facing text (errors, toasts, emails) is plain, friendly English with no internal jargon or stack traces
- Changes to sign-up, sign-in, OTP, account deletion, or email sending get extra scrutiny — call out any way they could lock users out or be abused
