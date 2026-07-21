# CV Resume Creation App — Technical Specifications

## Overview

A full-stack web application that allows users to build a professional CV/resume by filling in structured form sections. Upon completion, the app compiles the generated LaTeX (`.tex`) code directly into a downloadable PDF document (`.pdf`) using a backend compiler, saving the user from manually converting files.

The application also supports uploading a professional profile image which is dynamically embedded in the final PDF CV.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React (Vite), TailwindCSS         |
| Backend    | Node.js, Express.js (REST API)    |
| Database   | PostgreSQL                        |
| ORM        | Prisma (or pg/node-postgres raw)  |
| LaTeX Gen  | Python script (renders `.tex` markup from Jinja2 templates) |
| PDF Comp   | Server-side compiler (e.g., `pdflatex` or `tectonic` spawned by Node.js service) |
| Auth       | JWT (optional, for saving drafts) |

---

## 1. Frontend Specifications

### 1.1 Application Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx           # Section navigation & add-section buttons
│   │   ├── Header.jsx
│   │   └── PreviewPanel.jsx      # Live PDF preview panel (renders the compiled PDF in-browser via iframe/object URL)
│   ├── sections/
│   │   ├── PersonalDetails.jsx
│   │   ├── Experience.jsx
│   │   ├── Education.jsx
│   │   ├── Awards.jsx
│   │   ├── Projects.jsx
│   │   ├── Skills.jsx
│   │   ├── Characteristics.jsx
│   │   ├── Certifications.jsx
│   │   └── ResearchPublications.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── InputField.jsx
│   │   ├── TextArea.jsx
│   │   ├── TagInput.jsx          # For skills/characteristics
│   │   ├── DateRangePicker.jsx
│   │   └── SectionCard.jsx       # Wrapper with add/remove/reorder controls
│   └── modals/
│       ├── ExportModal.jsx       # Download options
│       └── AuthModal.jsx         # Sign in/up modal
├── pages/
│   ├── BuilderPage.jsx           # Main builder UI
│   └── LandingPage.jsx           # Landing page with product overview & CTAs
├── hooks/
│   ├── useCVStore.js             # Zustand or Context state
│   └── useAutoSave.js
├── services/
│   └── api.js                    # Axios instance & API calls
└── utils/
    └── validators.js
```

### 1.2 CV Sections & Fields

#### Personal Details *(always visible, required)*
| Field         | Type   | Notes                         |
|---------------|--------|-------------------------------|
| Full Name     | text   | Required                      |
| Job Title     | text   | e.g. "Software Engineer"      |
| Location      | text   | City, Country                 |
| Email (Gmail) | email  | Validated format              |
| Phone Number  | tel    | With country code             |
| LinkedIn URL  | url    |                               |
| GitHub URL    | url    |                               |
| Website       | url    | Optional                      |

#### Experience *(repeatable)*
| Field        | Type      |
|--------------|-----------|
| Job Title/Position    | text      |
| Company/Org      | text      |
| Location     | text      |
| Start Date   | month/yr  |
| End Date     | month/yr or "Present" |
| Description1  | textarea (bullet points) |
| Description2  | textarea (bullet points) |

#### Education *(repeatable)*
| Field        | Type      |
|--------------|-----------|
| Degree       | text      |
| Institution  | text      |
| Location     | text      |
| Start Date   | month/yr  |
| End Date     | month/yr or "Present" |
| GPA/GWA      | text (optional) |
| Notes        | textarea  |

#### Awards *(repeatable)*
| Field        | Type      |
|--------------|-----------|
| Award Title  | text      |
| Issuer       | text      |
| Date         | month/yr  |
| Description  | textarea  |

#### Projects *(repeatable)*
| Field         | Type      |
|---------------|-----------|
| Project Name  | text      |
| Tech Stack    | tag input |
| Start Date    | month/yr  |
| End Date      | month/yr  |
| Description1  | textarea  |
| Description2  | textarea  |
| URL / Repo    | url       |

#### Skills *(tag-based)*
| Field        | Type      |
|--------------|-----------|
| Skill Groups | key-value (e.g. "Languages: Python, JS") |

#### Characteristics *(tag-based)*
| Field           | Type     |
|-----------------|----------|
| Characteristic  | tags     |

#### Certifications *(repeatable)*
| Field           | Type      |
|-----------------|-----------|
| Cert Name       | text      |
| Issuing Body    | text      |
| Date Issued     | month/yr  |
| Expiry Date     | month/yr (optional) |
| Credential ID   | text      |
| URL             | url       |

#### Research Publications *(repeatable)*
| Field       | Type      |
|-------------|-----------|
| Title       | text      |
| Authors     | text      |
| Journal/Conf| text      |
| Date        | month/yr  |
| DOI / URL   | url       |
| Abstract    | textarea  |

---

### 1.3 Section Management

- A **sidebar or top toolbar** lists all possible sections.
- Sections not yet added show an **"Add Section" button**.
- Added sections appear in the main builder area as collapsible cards.
- Each section card has:
  - Collapse/expand toggle
  - Delete section button
  - Drag-to-reorder handle (optional v2)
- Repeatable sections (Experience, Education, etc.) have an **"Add Entry"** button that appends a new blank entry form.

### 1.3.1 Header Actions & Sign-In Flow

- The **Header** (`Header.jsx`) in the Builder page contains:
  - App Logo / Brand Name.
  - Draft status indicator ("Saved", "Saving...", "Syncing to cloud...", "Offline").
  - A prominent **"Sign In"** (or "Save Progress" / "Sign In to Save Permanently") button when the user is anonymous.
  - A user profile display and **"Sign Out"** button when the user is authenticated.
- **Authentication Modal (`AuthModal.jsx`):**
  - Triggered by clicking the "Sign In" button in the header.
  - Features quick toggle tabs for **Sign In** and **Create Account**.
  - On submission, calls `/api/auth/login` or `/api/auth/register`, retrieving a JWT token.
  - If a local anonymous draft exists in `localStorage`, the frontend immediately calls the claiming API (`POST /api/cv/:id/claim`) to link the draft to the new user account and prevent it from being deleted after 3 days.


### 1.4 State Management

- Use **Zustand** (recommended) or React Context + useReducer.
- CV state shape:

```js
{
  personal: { name, title, location, email, phone, linkedin, github, website },
  sections: [
    { id: uuid, type: "experience", order: 0, entries: [...] },
    { id: uuid, type: "education", order: 1, entries: [...] },
    // ...
  ]
}
```

- Auto-save to `localStorage` on every change (debounced 1s).
- **Anonymous Progress Saving (No Sign-in):**
  - On the first auto-save, if the user is anonymous (not signed in) and no `cv_id` exists in `localStorage`, the frontend POSTs to `/api/cv` (anonymous) to create a draft.
  - The backend returns a generated `cv_id` and a cryptographically secure random `access_token` (e.g. hex encoded).
  - The client stores both `cv_id` and `access_token` in `localStorage`.
  - Subsequent updates are sent via `PUT /api/cv/:id` with the token in the `X-CV-Access-Token` header.
  - If the user leaves and returns, the frontend retrieves the `cv_id` and `access_token` from `localStorage` and loads the draft via `GET /api/cv/:id` with the token header.
- **Registered Sync & Claiming Drafts:**
  - Registered users sync their drafts to the backend DB associated with their user account (requires JWT authorization header).
  - **Draft Claiming Flow:** When an anonymous user signs in or registers, the client claims the current anonymous draft by calling `POST /api/cv/:id/claim` with the JWT in `Authorization` header and the plaintext token in `X-CV-Access-Token` header.
  - On success, the draft's `user_id` is updated in the database and its `access_token_hash` is cleared (`NULL`). The client removes `cv_access_token` from `localStorage`. Since `user_id` is now set, the draft is permanently saved and is exempt from the 3-day inactivity deletion.


### 1.5 PDF Preview & Export Flow

1. The frontend layout features a split-pane interface (forms on the left, `PreviewPanel` on the right).
2. The user edits the form. Changes are sent to the backend for preview generation, either automatically (debounced after 2 seconds of inactivity) or manually when the user clicks a "Refresh Preview" button in the `PreviewPanel`.
3. Frontend POSTs the current CV JSON to `POST /api/cv/export`.
4. Backend parses the request, runs the Python script to generate LaTeX, compiles the `.tex` to `resume.pdf` via a LaTeX compiler (`pdflatex` or `tectonic`), and returns the compiled PDF file as a binary stream.
5. Frontend receives the stream as a Blob, generates a temporary browser Object URL via `URL.createObjectURL(pdfBlob)`, and updates the `src` of the iframe in `PreviewPanel` to display the PDF.
6. The `PreviewPanel` contains a "Download PDF" button. Clicking this button triggers a browser download using the already-fetched PDF Blob (e.g., via `<a download="resume.pdf">` or a save-file utility), avoiding a redundant compile request to the server.
7. Backend cleans up all temporary compilation files (`.tex`, `.pdf`, `.aux`, `.log`) immediately after streaming the PDF response.

### 1.6 Landing Page Specifications

The Landing Page (`LandingPage.jsx`) serves as the welcoming entry point of the web application, presenting a modern, high-converting product showcase that routes users directly into the CV Builder. It must match the layout and design patterns shown in `landing_pc.png` and `landing_mobile.png`.

#### 1.6.1 Navigation Header
*   **Logo/Brand Name**: Displays "ResumeForge" alongside a document-themed icon.
*   **Navigation Links (PC)**: Centered text links for "Features", "How it Works", and "Examples".
*   **Action Button (PC)**: "Get Started" purple pill-shaped button with a right arrow icon, routing users to `/builder`.
*   **Mobile View**: The navigation links and CTA are replaced by a responsive hamburger menu icon on the right side.

#### 1.6.2 Hero Section
*   **Header Announcement Badge**: A rounded pill badge with light purple/blue background stating `⚡ FREE & INSTANT — NO ACCOUNT NEEDED` (desktop) or `⚡ FREE & INSTANT — NO SIGN-UP` (mobile).
*   **Main Title (H1)**: "Build Your Resume in Minutes", featuring a distinct gradient or accent color highlight on the words "in Minutes".
*   **Subheadline**: "Fill in your details, we handle the formatting. Export a polished PDF instantly."
*   **Primary Call-to-Action (CTA)**: A prominent purple pill button "Create My Resume" accompanied by a document icon, routing directly to the CV Builder (`/builder`).
*   **Secondary Call-to-Action**: "See an Example" outlined/text button featuring a play/arrow icon.
*   **Trust Badges**: A list of key product features decorated with green checkmark icons:
    *   No sign-up required (Desktop) / No sign-up (Mobile)
    *   100% free
    *   Instant PDF export
    *   ATS-friendly format
    *   *Note: These badges wrap cleanly or stack vertically on mobile layouts.*

#### 1.6.3 "How It Works" Section
*   **Section Subtitle**: "HOW IT WORKS" in small caps/uppercase using a purple accent color.
*   **Section Title**: "Three simple steps to your perfect resume".
*   **Step Cards**: Three card elements presenting the workflow:
    1.  **01 Fill Your Details**: Displays a keyboard icon on a light purple/blue circular/rounded background, accompanied by the text: "Enter your name, experience, education, and skills into our clean, guided form. Takes just a few minutes."
    2.  **02 Review Layout**: Displays a preview eye icon on a light purple/blue circular/rounded background, accompanied by the text: "See a live preview of your formatted resume as you type. Choose from clean, professional templates that impress hiring managers."
    3.  **03 Export PDF**: Displays a document download/PDF icon on a light purple/blue circular/rounded background, accompanied by the text: "Download your finished resume as a pixel-perfect PDF instantly. Ready to send to employers or upload to any job platform."
*   **Desktop Layout**: Arranged in a horizontal 3-column layout. Step cards are connected visually by horizontal dashed lines.
*   **Mobile Layout**: Stacked vertically in a single-column layout. Each step card features the step number (`01`, `02`, `03`) highlighted in a purple circle on the left, with the respective icon shown on the right side of the card header.
*   **Mobile Sticky Bottom CTA**: A sticky/fixed bottom bar displaying a primary button "Start for Free" with a document icon to allow quick access to `/builder` at any point of scrolling.

> [!NOTE]
> **Branding Alignment**: While the landing page mockups use the name "ResumeForge", the form builder mockups use "CVcraft". The logo, brand name, and favicon should be consistently aligned across both the landing page and the builder page.

---

## 2. Backend Specifications

### 2.1 Project Structure

```
server/
├── src/
│   ├── routes/
│   │   ├── cv.routes.js         # CV CRUD & export
│   │   └── user.routes.js       # Auth (optional)
│   ├── controllers/
│   │   ├── cv.controller.js
│   │   └── export.controller.js
│   ├── services/
│   │   ├── cv.service.js        # Business logic
│   │   └── latex.service.js     # Calls Python script
│   ├── middleware/
│   │   ├── validate.js          # Joi/Zod request validation
│   │   └── errorHandler.js
│   ├── db/
│   │   ├── pool.js              # pg Pool instance
│   │   └── migrations/          # SQL migration files
│   ├── utils/
│   │   └── fileCleanup.js       # Remove temp .tex files
│   └── app.js
├── python/
│   └── generate_latex.py        # LaTeX generation script
├── .env
└── package.json
```

### 2.2 REST API Endpoints

#### CV Resource

#### User Auth Resource

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| POST   | `/api/auth/register`  | Register a new user account.       |
| POST   | `/api/auth/login`     | Authenticate user and return JWT.  |

#### CV Resource

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| POST   | `/api/cv`             | Save a new CV draft. Generates a secure `access_token` if anonymous (no JWT auth header). |
| GET    | `/api/cv/:id`         | Retrieve a saved CV by ID. Requires `X-CV-Access-Token` for anonymous drafts. |
| PUT    | `/api/cv/:id`         | Update a CV draft. Requires JWT auth or valid `X-CV-Access-Token`. |
| DELETE | `/api/cv/:id`         | Delete a CV. Requires JWT auth or valid `X-CV-Access-Token`. |
| POST   | `/api/cv/:id/claim`   | Link an anonymous CV to an authenticated user (claims ownership). Requires JWT auth and `X-CV-Access-Token`. |
| POST   | `/api/cv/export`      | Generate and download compiled `.pdf` file |
| POST   | `/api/cv/:id/export`  | Export a saved CV by ID as a `.pdf` file. Requires validation if anonymous. |


#### Request Body — Save/Update CV

```json
{
  "personal": {
    "name": "Juan dela Cruz",
    "title": "Software Engineer",
    "location": "Davao City, Philippines",
    "email": "juan@gmail.com",
    "phone": "+63 912 345 6789",
    "linkedin": "https://linkedin.com/in/juan",
    "github": "https://github.com/juan",
    "website": ""
  },
  "sections": [
    {
      "type": "experience",
      "order": 0,
      "entries": [
        {
          "title": "Backend Developer",
          "company": "Acme Corp",
          "location": "Remote",
          "startDate": "2022-06",
          "endDate": "Present",
          "description": "Built REST APIs...\nManaged PostgreSQL databases..."
        }
      ]
    }
  ]
}
```

#### Response — Export

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="resume.pdf"`
- Body: raw `.pdf` binary stream

### 2.3 Database Schema (PostgreSQL)

```sql
-- Users (optional, for saved drafts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CV Drafts
CREATE TABLE cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  access_token_hash TEXT, -- SHA-256 hash of the anonymous access token
  title TEXT DEFAULT 'My Resume',
  personal_data JSONB NOT NULL DEFAULT '{}',
  sections JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_cvs_user_id ON cvs(user_id);

-- Index for cleaning up anonymous CVs that have not been updated for 3 days
CREATE INDEX idx_cvs_anonymous_updated_at ON cvs(updated_at) WHERE user_id IS NULL;
```

> All structured section data is stored as **JSONB** for flexibility, avoiding the need for many joined tables.

### 2.4 Python LaTeX Generation

**Script:** `python/generate_latex.py`

- Accepts CV JSON via **stdin** or as a **CLI argument** (`--json`).
- Outputs a valid `.tex` markup to **stdout**.
- Uses Jinja2 templating for `.tex` template rendering.
- Node.js calls this script and compiles the PDF using a sub-process wrapper.

```js
// latex.service.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function generatePdf(cvData) {
  return new Promise((resolve, reject) => {
    const runId = uuidv4();
    const tempDir = path.join(process.env.TEMP_DIR || './tmp', runId);
    
    // 1. Setup workspace directory
    fs.mkdirSync(tempDir, { recursive: true });

    const renderData = {
      ...cvData,
      personal: {
        ...cvData.personal
      }
    };

    // 2. Generate LaTeX code via Python script
    const py = spawn(process.env.PYTHON_PATH || 'python3', ['./python/generate_latex.py']);
    let texContent = '';
    let pyError = '';
    
    py.stdin.write(JSON.stringify(renderData));
    py.stdin.end();
    
    py.stdout.on('data', chunk => texContent += chunk);
    py.stderr.on('data', chunk => pyError += chunk);
    
    py.on('close', code => {
      if (code !== 0) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return reject(new Error(`LaTeX template generation failed: ${pyError}`));
      }
      
      const texPath = path.join(tempDir, 'resume.tex');
      fs.writeFileSync(texPath, texContent);
      
      // 3. Compile .tex to .pdf using pdflatex
      // Execute in tempDir so generated build artifacts stay contained
      const compiler = spawn('pdflatex', [
        '-interaction=nonstopmode',
        '-halt-on-error',
        'resume.tex'
      ], { cwd: tempDir });
      
      let compilerLog = '';
      compiler.stdout.on('data', chunk => compilerLog += chunk);
      
      compiler.on('close', compileCode => {
        if (compileCode !== 0) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          return reject(new Error(`PDF compilation failed. Log: ${compilerLog}`));
        }
        
        const pdfPath = path.join(tempDir, 'resume.pdf');
        if (fs.existsSync(pdfPath)) {
          const pdfBuffer = fs.readFileSync(pdfPath);
          // Delete temp files asynchronously to free disk space
          fs.rm(tempDir, { recursive: true, force: true }, () => {});
          resolve(pdfBuffer);
        } else {
          fs.rmSync(tempDir, { recursive: true, force: true });
          reject(new Error('PDF file not found after successful compile run.'));
        }
      });
    });
  });
}
```

### 2.5 Environment Variables

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/cvapp
JWT_SECRET=your_secret_here
PYTHON_PATH=python3
TEMP_DIR=./tmp
```

---

## 3. Security Considerations

- Sanitize all inputs before passing to the Python script (prevent shell injection).
- Use parameterized queries or an ORM for all DB operations.
- Rate-limit the `/api/cv/export` endpoint (expensive operation).
- Clean up temporary `.tex` files after serving the download.
- CORS configured to allow only the frontend origin.
- **Anonymous Progress Security:**
  - Token hashing: The backend stores the cryptographic SHA-256 hash of the anonymous access tokens (`access_token_hash`) instead of the plaintext tokens. This prevents exposure of access tokens in the event of a database leak, ensuring an attacker cannot use the database to access/modify live CV sessions.
  - Verification: When reading/updating anonymous drafts, the client must supply the plaintext token in the `X-CV-Access-Token` header. The server hashes the header input and compares it against `access_token_hash` in the database.
  - Claim Validation: The claiming endpoint `/api/cv/:id/claim` requires dual verification. The request must present a valid JWT token (proving user identity) AND the correct plaintext `access_token` in the `X-CV-Access-Token` header (proving current ownership of the anonymous draft). This prevents malicious users from claiming other users' drafts.

- **Database Bloat & Bot Prevention:**
  - Rate limiting: Apply strict rate limiting on `POST /api/cv` to prevent automated scripts from creating thousands of empty records (e.g., limit to 10 drafts created per IP address per hour).
  - Size validation: Limit request payload sizes to a maximum of 125kB for all CV schema submissions to prevent massive payload spam from inflating database storage.
  - Inactivity Cleanup: A background cron worker must run daily to delete any anonymous CV drafts (`user_id IS NULL`) that have not been updated in the last 3 days:
    ```sql
    DELETE FROM cvs WHERE user_id IS NULL AND updated_at < NOW() - INTERVAL '3 days';
    ```

---

## 4. Non-Functional Requirements

| Requirement    | Target                            |
|----------------|-----------------------------------|
| LaTeX export   | < 3 seconds response              |
| Auto-save      | Debounced, every 1s of inactivity |
| Accessibility  | WCAG 2.1 AA compliance            |
| Mobile Support | Responsive down to 375px          |
| Browser Support| Chrome, Firefox, Safari, Edge     |
