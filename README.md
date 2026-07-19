# LaTeX CV Resume Creator App

A full-stack web application for building professional CVs/resumes. Users input their information through a structured form, and the app compiles it into a downloadable PDF using LaTeX.

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React (Vite), TailwindCSS         |
| Backend    | Node.js, Express.js (REST API)    |
| Database   | PostgreSQL                        |
| LaTeX Gen  | Python + Jinja2 templates         |
| PDF Comp   | pdflatex (via Node.js)            |

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **PostgreSQL** (v12 or higher)
- **Python 3** (with Jinja2)
- **pdflatex** (from TeX Live or MiKTeX)

## Project Structure

```
cv-resume-creator-app/
├── client/              # React frontend (Vite)
├── server/              # Node.js/Express backend
│   ├── src/
│   │   ├── app.js       # Express app setup
│   │   ├── index.js     # Entry point
│   │   └── db/
│   │       └── pool.js  # PostgreSQL connection pool
│   └── db/
│       └── migrations/  # SQL migration files
├── package.json         # Root workspace config
└── .env                 # Environment variables (see .env.example)
```

## Installation & Setup

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd cv-resume-creator-app
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env` with your local PostgreSQL credentials:

```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/cvapp
JWT_SECRET=your_secret_here_change_in_production
PYTHON_PATH=python3
TEMP_DIR=./tmp
NODE_ENV=development
```

### 3. Setup PostgreSQL Database

```bash
# Create the database
createdb cvapp

# Run migrations
psql cvapp < server/db/migrations/001_create_users.sql
psql cvapp < server/db/migrations/002_create_cvs.sql
```

### 4. Install Dependencies

```bash
# Install root and workspace dependencies
npm install
npm --workspace=client install
npm --workspace=server install
```

### 5. Install Development Dependencies

The server needs additional dev dependencies:

```bash
npm --workspace=server install
```

## Running the Application

### Development Mode

**Terminal 1 - Start Backend:**

```bash
cd server
npm run dev
```

Server will start on `http://localhost:5000`

**Terminal 2 - Start Frontend:**

```bash
cd client
npm run dev
```

Frontend will start on `http://localhost:5173` (or as shown in terminal)

### Production Build

```bash
npm run build --workspace=client
```

## Testing

Run backend tests:

```bash
npm test --workspace=server
```

Run linting for frontend:

```bash
npm run lint --workspace=client
```
    npm run dev
    ```

3.  **Access the Application**
    Open your browser and go to `http://localhost:5173`.
