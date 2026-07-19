# CV Resume Creation App — Development TODO

> Ordered by dependency. Complete phases sequentially; items within a phase can be parallelized.

---

## Phase 0 — Project Setup

### Repository & Tooling
- [ ] Initialize monorepo structure:
  ```
  /
  ├── client/   (React + Vite)
  └── server/   (Node.js + Express)
  ```
- [ ] Add root `package.json` with workspaces (or use separate repos)
- [ ] Add `.gitignore` for `node_modules`, `.env`, `tmp/`, `dist/`
- [ ] Add `README.md` with setup instructions

### Backend Bootstrap
- [ ] `cd server && npm init -y`
- [ ] Install dependencies: `express`, `pg`, `dotenv`, `cors`, `helmet`, `joi`, `uuid`
- [ ] Install dev dependencies: `nodemon`, `jest`, `supertest`
- [ ] Create `.env` from `.env.example`
- [ ] Set up `src/app.js` with Express instance and middleware (cors, helmet, json parser)
- [ ] Set up `src/index.js` entry point with port binding
- [ ] Confirm server starts: `npm run dev`

### Frontend Bootstrap
- [ ] `cd client && npm create vite@latest . -- --template react`
- [ ] Install dependencies: `axios`, `zustand`, `react-router-dom`, `@dnd-kit/core`
- [ ] Install TailwindCSS and configure `tailwind.config.js`
- [ ] Remove Vite boilerplate (App.css, logo, etc.)
- [ ] Confirm app renders: `npm run dev`

### Database Setup
- [ ] Install and start PostgreSQL locally (or provision via Docker)
- [ ] Create database: `createdb cvapp`
- [ ] Write `db/migrations/001_create_users.sql`
- [ ] Write `db/migrations/002_create_cvs.sql`
  - [ ] Add `access_token_hash` field to `cvs` table (nullable TEXT)
  - [ ] Add index on `user_id` for fast lookups
  - [ ] Add partial index `idx_cvs_anonymous_updated_at` on `updated_at` where `user_id IS NULL`
- [ ] Run migrations manually or via a migration script

- [ ] Create `src/db/pool.js` with `pg.Pool` using `DATABASE_URL`
- [ ] Test DB connection from Node.js

---

## Phase 1 — Backend: Core API

### CV CRUD Endpoints
- [ ] Create `src/routes/cv.routes.js` and mount at `/api/cv`
- [ ] **POST `/api/cv`** — Save new CV draft
  - [ ] Validate request body (Joi schema: personal + sections)
  - [ ] Check if authenticated. If anonymous:
    - [ ] Generate secure random hex string as `access_token`
    - [ ] Hash token using SHA-256 to create `access_token_hash`
    - [ ] Insert into `cvs` table (`personal_data`, `sections`, `access_token_hash`)
    - [ ] Return `{ id, accessToken, createdAt }`
  - [ ] If authenticated: Insert with `user_id` and return `{ id, createdAt }`
- [ ] **GET `/api/cv/:id`** — Fetch CV by ID
  - [ ] Validate UUID format
  - [ ] Retrieve row and check permission:
    - [ ] If anonymous draft (`user_id` is NULL): hash `X-CV-Access-Token` request header and compare with database `access_token_hash`. Return 401/403 if missing or mismatch.
    - [ ] If authenticated draft: verify token matches owner (`user_id`).
  - [ ] Return full CV JSON or 404
- [ ] **PUT `/api/cv/:id`** — Update CV draft
  - [ ] Validate body and UUID
  - [ ] Verify permission (hash `X-CV-Access-Token` for anonymous, or check JWT user ID)
  - [ ] Update row, set `updated_at = NOW()`
  - [ ] Return updated CV
- [ ] **DELETE `/api/cv/:id`** — Delete CV
  - [ ] Verify permission (hash `X-CV-Access-Token` for anonymous, or check JWT user ID)
  - [ ] Return 204 on success


### Validation Middleware
- [ ] Create `src/middleware/validate.js` using Joi
- [ ] Define Joi schemas for personal details and each section type
- [ ] Apply validation middleware to all POST/PUT routes

### Rate Limiting & Bloat Prevention
- [ ] Apply body size limit to Express parser: `app.use(express.json({ limit: '125kb' }))`
- [ ] Configure `express-rate-limit` for `POST /api/cv` (max 10 requests per hour per IP)
- [ ] Configure general rate limiting for preview generation and export endpoints

### Inactivity Cleanup Service
- [ ] Create database cleanup cron worker `src/utils/cleanupWorker.js` (using `node-cron` or simple daily timer)
- [ ] Implement pruning query: `DELETE FROM cvs WHERE user_id IS NULL AND updated_at < NOW() - INTERVAL '3 days'`
- [ ] Hook cleanup script to server start up process and run once every 24 hours


### Error Handling
- [ ] Create `src/middleware/errorHandler.js`
- [ ] Wrap all controllers in try/catch
- [ ] Return consistent error shape: `{ error: true, message, statusCode }`

---

## Phase 2 — Backend: LaTeX to PDF Compilation

### PDF Compiler Setup
- [ ] Install PDF LaTeX compiler on server host machine (e.g., `pdflatex` via TeX Live/MiKTeX, or `tectonic`)
- [ ] Add `PYTHON_PATH`, `TEMP_DIR`, and compiler executables to `.env` configuration

### Python Script
- [ ] Create `server/python/generate_latex.py`
  - [ ] Read CV JSON from stdin (`import sys, json; data = json.load(sys.stdin)`)
  - [ ] Install Jinja2: `pip install jinja2`
  - [ ] Create `templates/resume.tex.j2` — base LaTeX template
  - [ ] Implement rendering for each section type (Personal, Experience, Education, etc.)
  - [ ] Handle optional sections (skip if not present in JSON)
  - [ ] Output rendered `.tex` markup to stdout
  - [ ] Test script independently: `echo '{"personal": {...}}' | python3 generate_latex.py`

### LaTeX/PDF Service (Node.js)
- [ ] Create `src/services/latex.service.js`
  - [ ] Generate unique run ID (`uuid`) and create a temporary subdirectory under `TEMP_DIR`
  - [ ] Spawn Python script to generate `.tex` string and write to a `resume.tex` file in the temp subdirectory
  - [ ] Spawn PDF compiler child process (e.g., `pdflatex -interaction=nonstopmode resume.tex`) within the temp subdirectory
  - [ ] Capture compiler output and handle non-zero exit codes (log compilation errors)
  - [ ] Read the compiled `resume.pdf` into a buffer, resolve the promise, and clean up the temp directory asynchronously

### Export Endpoint
- [ ] **POST `/api/cv/export`** — Generate `.pdf` from request body
  - [ ] Validate request body
  - [ ] Call `latex.service.generatePdf(cvData)`
  - [ ] Set response headers:
    - `Content-Type: application/pdf`
    - `Content-Disposition: attachment; filename="resume.pdf"`
  - [ ] Stream the `.pdf` buffer in the response
- [ ] **POST `/api/cv/:id/export`** — Export saved CV by ID as a `.pdf` file
  - [ ] Fetch CV from DB, then compile to PDF using the same service
- [ ] Add rate limiting to export endpoints (`express-rate-limit`)

### Temp File Cleanup
- [ ] Create `src/utils/fileCleanup.js`
  - [ ] Verify background/failsafe clean up scripts for abandoned temporary compiler directories

---

## Phase 3 — Frontend: State & Layout

### Global State (Zustand)
- [ ] Create `src/hooks/useCVStore.js`
- [ ] Define store shape:
  ```js
  { personal: { name, title, location, ... }, sections: [], addSection, removeSection,
    updatePersonal, addEntry, updateEntry, removeEntry, reorderSections }
  ```
- [ ] Implement all actions
- [ ] Add `localStorage` persistence middleware (Zustand persist) to store draft state locally
- [ ] Add auto-save hook `useAutoSave.js` (debounced sync to backend)
  - [ ] Load `cv_id` and `cv_access_token` from `localStorage` on init, if present fetch draft via `GET /api/cv/:id`
  - [ ] On first save: call `POST /api/cv` (anonymous) and store returned `id` and `accessToken` in `localStorage`
  - [ ] On subsequent updates: call `PUT /api/cv/:id` with `X-CV-Access-Token` header set to the stored access token


### App Layout
- [ ] Create `src/pages/BuilderPage.jsx` as main layout
  - [ ] Implement split-pane workspace: input form on the left, `PreviewPanel` on the right (collapsible/tabbed layout on mobile screens)
- [ ] Create `src/components/layout/Sidebar.jsx`
  - [ ] List all 9 possible sections
  - [ ] Show "Add" button for sections not yet added
  - [ ] Show "Added ✓" state for active sections
- [ ] Create `src/components/layout/Header.jsx`
  - [ ] App logo/name
  - [ ] Draft saving / connection state status indicator
- [ ] Create `src/components/layout/PreviewPanel.jsx`
  - [ ] Standard iframe or custom PDF viewer to render the PDF Object URL in-browser
  - [ ] Compilation state overlay (loading spinner/skeleton)
  - [ ] Manual "Refresh Preview" action button
  - [ ] "Download PDF" CTA button that downloads the currently compiled PDF blob directly from browser memory
- [ ] Set up routing in `App.jsx` (react-router-dom) with paths:
  - `/` -> `LandingPage.jsx`
  - `/builder` -> `BuilderPage.jsx`

### Landing Page
- [ ] Create `src/pages/LandingPage.jsx` based on mockups
  - [ ] Implement Navigation Header matching `landing_pc.png` and `landing_mobile.png` (with "ResumeForge" branding, text links on desktop, and hamburger menu trigger on mobile)
  - [ ] Implement Hero section with announcement badge, typography headers with gradient accent, CTA buttons ("Create My Resume" & "See an Example"), and trust checklist with green checkmarks
  - [ ] Implement "How it Works" section with 3-step cards:
    - Step 01: "Fill Your Details" (keyboard icon)
    - Step 02: "Review Layout" (eye icon)
    - Step 03: "Export PDF" (document download icon)
    - Desktop: horizontal 3-column layout with connecting dashed lines
    - Mobile: vertical stacked layout with step number circles on the left and icons on the right
  - [ ] Implement mobile-only sticky bottom CTA button ("Start for Free")
  - [ ] Ensure all CTA buttons correctly route the user to the builder page (`/builder`)

---

## Phase 4 — Frontend: Section Components

### Shared UI Components
- [ ] `InputField.jsx` — label + input with validation state
- [ ] `TextArea.jsx` — label + textarea with character hint
- [ ] `TagInput.jsx` — comma-separated tag entry with pill display
- [ ] `DateRangePicker.jsx` — start/end month-year selectors + "Present" checkbox
- [ ] `SectionCard.jsx` — collapsible card with remove button and entry list

### Personal Details Section
- [ ] `PersonalDetails.jsx`
  - [ ] Fields: name, title, location, email, phone, linkedin, github, website
  - [ ] Always rendered (cannot be removed)
  - [ ] Inline validation (email format, URL format)

### Repeatable Entry Sections
For each: Experience, Education, Awards, Projects, Certifications, Research Publications:
- [ ] Create `{SectionName}.jsx` component
- [ ] Render list of entry cards from store
- [ ] Each entry card shows all relevant fields (see SPECS.md §1.2)
- [ ] "Add Entry" button appends blank entry to store
- [ ] Each entry has a "Remove Entry" button
- [ ] Entries are individually collapsible

#### Specific Sections
- [ ] `Experience.jsx` — title, company, location, dates, description textarea
- [ ] `Education.jsx` — degree, institution, location, dates, GPA, notes
- [ ] `Awards.jsx` — title, issuer, date, description
- [ ] `Projects.jsx` — name, tech stack (tags), dates, description, URL
- [ ] `Certifications.jsx` — name, issuer, issue date, expiry, credential ID, URL
- [ ] `ResearchPublications.jsx` — title, authors, journal, date, DOI/URL, abstract

### Tag-Based Sections
- [ ] `Skills.jsx`
  - [ ] Allow multiple skill groups (e.g. "Languages", "Frameworks")
  - [ ] Each group: label input + TagInput for skills
  - [ ] "Add Group" button
- [ ] `Characteristics.jsx`
  - [ ] Single TagInput for personal traits/soft skills

---

## Phase 5 — Frontend: Preview & PDF Rendering

- [ ] Create `src/services/api.js`
  - [ ] Axios instance with `baseURL` from env
  - [ ] Set up interceptors to attach `X-CV-Access-Token` header if available in `localStorage`
  - [ ] `exportCV(cvData)` — POST to `/api/cv/export`, receive raw PDF Blob
  - [ ] `saveCV(cvData)` — POST to `/api/cv`
  - [ ] `loadCV(id)` — GET `/api/cv/:id`

- [ ] Implement Preview compilation logic in `BuilderPage.jsx`:
  - [ ] Debounce user inputs (e.g. 2s) to trigger auto-compile requests to `/api/cv/export`
  - [ ] Convert PDF Blob response to local Object URL via `URL.createObjectURL(pdfBlob)`
  - [ ] Revoke previous Object URLs to avoid memory leaks
  - [ ] Pass the Object URL to `PreviewPanel.jsx` to render inside the iframe
  - [ ] Catch compiler error messages and display them in the preview area
- [ ] Connect "Download PDF" button in `PreviewPanel.jsx` to trigger file saving from the cached local PDF Blob directly (avoiding another compile request)

---

## Phase 6 — Polish & QA

### Validation & UX
- [ ] Add required field indicators and inline error messages
- [ ] Prevent export if Personal Details are incomplete (name + email minimum)
- [ ] Show unsaved changes indicator
- [ ] Add empty state illustrations for sections with no entries

### Accessibility
- [ ] All inputs have associated `<label>` elements
- [ ] Focus management when adding/removing entries
- [ ] Keyboard navigable section cards
- [ ] ARIA labels on icon-only buttons (remove, collapse)

### Responsive Design
- [ ] Test and fix layout on mobile (375px)
- [ ] Sidebar collapses to bottom drawer on mobile
- [ ] Entry forms stack vertically on small screens

### Testing
- [ ] Backend: write Jest + Supertest tests for all API endpoints
- [ ] Backend: write unit tests for `latex.service.js` (mock child_process)
- [ ] Frontend: write React Testing Library tests for key components
- [ ] Integration: test full export flow end-to-end
- [ ] Test Python script with minimal, partial, and full CV JSON

---

## Phase 7 — Optional Enhancements (v2)

- [ ] User authentication (JWT) — save/load multiple CV drafts
- [ ] Drag-and-drop section reordering (`@dnd-kit/core`)
- [ ] Live PDF preview panel (render PDF in-browser via PDF.js or an iframe)
- [ ] Multiple LaTeX template styles (modern, classic, academic)
- [ ] Share CV via public link
- [ ] Import from LinkedIn (scrape or OAuth)
- [ ] Dark mode toggle

---

## Quick Reference: Definition of Done

| Item         | Done When                                                        |
|--------------|------------------------------------------------------------------|
| Backend endpoint | Returns correct status codes, validated inputs, tested        |
| Section component | Renders, updates Zustand store, validates required fields    |
| Python script | Produces valid compilable `.tex` for all section combinations   |
| Export flow  | `.pdf` file downloads correctly in Chrome, Firefox, Safari       |
| Overall app  | All sections can be added, filled, and exported without errors   |
