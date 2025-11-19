# Uni & Work Tracker

A web-based dashboard to track:

- **Uni**: courses, assignments (with weights & grades), notes (per course)
- **Work**: tasks and context for what you’re doing
- **Calendar**: assignment due dates, note creation dates, work task deadlines, and (later) Outlook/Canvas events

It includes:

- Login page with particles background (ReactBits-ready)
- SQLite database via Prisma
- Basic scaffolding for Microsoft (Outlook) and Canvas integrations

---

## 1. Running locally

From the project root:

```bash
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

Then open `http://localhost:3000` — you’ll be redirected to `/login`.

### Login

- After login, you land on `/dashboard` with **Uni**, **Work**, and **Calendar** tabs.

---

## 2. Features & how to use them

### 2.1 Uni

- **Courses**
  - In the Uni tab, use the *Courses* panel to add courses (name + code).
  - Courses are stored per user.
- **Assignments**
  - Assignments are stored per course with:
    - `title`, `description`, `dueDate`
    - `weight` (e.g. `0.2` for 20%)
    - `maxGrade`, `grade` (when you receive it)
  - They show up in the Uni tab list and on the Calendar (by due date).
- **Notes**
  - Notes belong to a user and optionally a course.
  - They appear in the Uni tab and on the Calendar on their creation date.

> Note: the UI currently shows courses, assignments, and notes; you can extend it to add full create/edit forms for assignments and notes using the existing `/api/uni/assignments` and `/api/uni/notes` endpoints.

### 2.2 Work

- Add work tasks with:
  - `title`
  - `context` (free-text description of what you’re doing)
  - optional `dueDate`
- Cycle a task’s status between `todo → in_progress → done` by clicking its status pill.
- Tasks appear in the Work tab and on the Calendar (if they have a due date).

### 2.3 Calendar

- Uses `react-big-calendar` + `date-fns`.
- `/api/calendar/events` merges:
  - Assignments (dueDate)
  - Notes (createdAt)
  - Work tasks (dueDate)
- In the Calendar tab, you see these events in a monthly/weekly/day view.

---

## 3. Auth & adding more users

### 3.1 Auth

- Login is handled by `POST /api/auth/login`.
- On success, a signed JWT is stored in the `auth-token` cookie.
- `middleware.ts` protects all routes except `/login` and `/api/auth/login`.

### 3.2 Adding users via seed script

The seed script (`prisma/seed.mjs`) creates the default admin user. To add more users, you have two options:

1. **Extend the seed script**
   - Edit `prisma/seed.mjs` and add more `upsert` calls with different usernames/password hashes.
   - Re-run:

   ```bash
   npm run seed
   ```

2. **Use Prisma Studio**
   - Start Prisma Studio:

   ```bash
   npm run prisma:studio
   ```

   - Open the `User` table and create a new user row:
     - `username`: desired username
     - `passwordHash`: bcrypt hash of their password (you can use an online bcrypt generator during dev)
     - `role`: `user` or `admin`

> For production, avoid manual hashing in the DB; instead, add an admin UI or a dedicated API route that hashes passwords on the server.

---

## 4. Integrating the ReactBits particles background

The login page (`app/login/page.tsx`) uses `ParticlesBackground` from `components/ParticlesBackground.tsx`.

1. Go to <https://reactbits.dev/backgrounds/particles>.
2. Copy the particles background component snippet from ReactBits.
3. Replace the placeholder implementation in `components/ParticlesBackground.tsx` with the real ReactBits code.

The login page will automatically pick up the new animated background.

---

## 5. Microsoft (Outlook) integration scaffolding

Environment variables (already declared in `.env`):

- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_TENANT_ID` (usually `common` or your tenant ID)
- `MS_REDIRECT_URI` (e.g. `http://localhost:3000/api/integrations/microsoft/callback` in dev)

Routes:

- `GET /api/integrations/microsoft/login`
  - Redirects to the Microsoft login page.
- `GET /api/integrations/microsoft/callback`
  - Placeholder that receives `code` and should exchange it for tokens.

To fully enable Outlook calendar/email tasks:

1. Register an app in Azure Active Directory.
2. Configure the redirect URI to `https://your-vercel-app.vercel.app/api/integrations/microsoft/callback`.
3. Fill the Microsoft env vars in Vercel.
4. Implement the token exchange + storage in the callback route.
5. Add routes to:
   - Fetch `/me/events` and map to calendar events.
   - Fetch `/me/messages` and map to `WorkTask` entries.

---

## 6. Canvas (UTS) integration scaffolding

Environment variables:

- `CANVAS_BASE_URL` (default: `https://canvas.uts.edu.au`)
- `CANVAS_API_TOKEN` (generate from Canvas user settings)

Route:

- `POST /api/integrations/canvas/sync`
  - Placeholder that checks for `CANVAS_API_TOKEN` and returns `{ success: true }`.

To fully sync with Canvas:

1. Generate a Canvas API token.
2. Set `CANVAS_API_TOKEN` in your env (locally and on Vercel).
3. In `app/api/integrations/canvas/sync/route.ts`:
   - Call Canvas endpoints, e.g. `/api/v1/courses`, `/api/v1/courses/:id/assignments`.
   - Map results into `UniCourse` and `Assignment` via Prisma.
4. Optionally add a button in the Uni tab to trigger this sync.

---

## 7. Deploying to Vercel

1. **Push to Git** (GitHub/GitLab/Bitbucket).
2. Go to <https://vercel.com>, create a project, and import the repo.
3. In **Project → Settings → Environment Variables**, set at least:
   - `DATABASE_URL` (for SQLite, use `file:./dev.db` or a hosted DB connection string)
   - `JWT_SECRET` (a long random string)
   - Optional: `MS_*` and `CANVAS_*` variables
4. Deploy.
5. Update your Microsoft app registration redirect URI to your production callback URL:

   - `https://YOUR_APP.vercel.app/api/integrations/microsoft/callback`

After deploy, you can log in with `LucasA06 / SuperD00per` and start using the dashboard.
