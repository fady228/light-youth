# Light Youth

Youth-ministry web app: daily devotions with questions, a Learning library (articles, videos, sermon PDFs), points, streaks, and a leaderboard.
**React (Vite + TypeScript)** frontend · **NestJS + TypeORM** API · **MariaDB/MySQL** database.

Devotions, questions, learning content and rewards all live in the database and are served by the API.

## Quick start

```bash
# 1. Database (MariaDB in Docker; or point .env at your own MySQL/MariaDB)
docker compose up -d

# 2. API
cd backend
cp .env.example .env        # set JWT_SECRET
npm install
npm run seed                # creates tables' starter data + admin account
npm run start:dev           # http://localhost:3000/api

# 3. Web (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Create an account on the login page and you're in. The seed adds 3 devotions (one dated
today), 3 articles and 3 reward milestones. Admin login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`.

## How it works

- **Devotions** are one per day (`publishDate`). Users see today's and past ones, never future ones.
  Each has questions: `multiple_choice` and `true_false` are auto-graded; `open` answers
  (min 20 chars) earn full points. One submission per user per devotion, and correct answers are only
  revealed after submitting.
- **Missed days.** Each devotion has a per-user status: **done** (answered on its day), **missed** (a day you
  didn't answer), **late** (a missed day answered afterwards), **open** (today's, not answered yet) and **archive**
  (from before you joined, so it is never held against you). A missed day can still be answered and appears in
  Past answers, but it is graded for practice only: **0 points, and it doesn't count toward the streak.**
  The Devotions page filters by To do / Done / Missed, Bible book, and text.
- **Past answers** (on the profile) grow daily, so they're searchable by title or passage, filterable by Bible book
  and on-time vs late, and paged ("Show more"). Every row opens that day's answers.
- **Points** are added to the user in the same transaction as the submission.
- **Streak** = consecutive days (in `APP_TIMEZONE`) with an **on-time** submission.
- **Rewards** table drives the "N pts to Sticker pack & candy" progress bar.
- **Bible passages are picked, not typed.** Devotions and Learning use Book → Chapter → verse dropdowns built from the real
  66-book / 1,189-chapter data (`GET /bible/books`), so there are no typos and filtering/search is consistent.
- **Learning** is a library of three content types: **articles** (text), **videos** (a YouTube/Vimeo/.mp4 link that plays on the page,
  any other link opens in a new tab) and **sermons** (an uploaded PDF, previewed on the page). Videos and sermons have a required
  **summary** (shown on the card and searched); **articles don't**: their card preview is generated from the text. Every item can
  have Bible passages and up to 8 **tags**, and **published items must have at least one tag** (drafts may be untagged).
  Tags are chosen from existing ones or created in the form. Items can be saved; saved ones appear on the profile.
- **Text formatting:** article text, video/sermon notes and devotion readings are rendered as **Markdown** (`**bold**`, `# headings`,
  `- bullet lists`, `1. numbered lists`, `> quotes`, links). Line breaks are kept, and pasted `•` bullets become real lists. Raw HTML and
  images are never rendered. The admin form has a Write / Preview toggle.
- **Search & filters:** the Learning page (youth and admin) has a search box plus filters for **content type**, **Bible book** and **tag**.
  They combine, and live in the URL (`/learning?q=grace&type=video&passage=Romans&tag=prayer`). Search uses a MariaDB/MySQL **FULLTEXT** index on
  `learning_items(title, summary, content)` in boolean mode: every meaningful word must appear, prefixes match (`reconcil` finds "reconciliation"),
  results are ranked by relevance, and a tag name or passage reference containing the query also matches. Admin search includes drafts.

## API (prefix `/api`, JWT bearer auth except `/auth/*`)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/google` | returns `{ accessToken }` |
| GET / PATCH | `/users/me` | profile, points, rank, streak, next reward |
| GET | `/users/me/answers` | past answers: `?book=&q=&status=done\|late&limit=&offset=` → `{ items, total, counts, books }` |
| GET | `/leaderboard` | top 50 |
| GET | `/devotions` | `?status=open\|done\|missed&book=&q=` → `{ items, counts, books }`; each item has a per-user `status` |
| GET | `/devotions/today`, `/devotions/:id` | |
| GET | `/bible/books` | 66 books with chapter counts (for the pickers) |
| POST | `/devotions/:id/submit` | `{ answers: [{questionId, answer}] }` |
| GET | `/learning`, `/learning/saved`, `/learning/:id` | `/learning` accepts `?q=`, `?type=article\|video\|sermon`, `?passage=<book>`, `?tag=<slug>`, `?featured=true` |
| GET | `/learning/facets` | filter options with counts: types, Bible books (Bible order), tags |
| POST / DELETE | `/learning/:id/save` | |
| GET | `/devotions/admin/all`, `/devotions/admin/:id`, `/learning/admin/all`, `/learning/admin/:id`, `/learning/admin/facets` | **admin** (include future / draft items; used by the reading views; `learning/admin/all` accepts the same filters) |
| POST | `/learning/upload` | **admin**, multipart field `file` (PDF, max 25 MB) → `{ fileName, fileOriginal }` |
| POST, PATCH, DELETE | `/devotions`, `/devotions/:id` | **admin** (PATCH edits the text/passages/date, not the questions) |
| POST, PATCH, DELETE | `/learning`, `/learning/:id` | **admin** |

### Admin area

Admins sign in at **`/admin/login`** (admins who use the normal login page are redirected to `/admin`).
It has its own calm cream-and-olive look and three pages:

- **Home** (`/admin`): shows whether today's devotion is posted, with quick actions to
  **add today's devotion** (reading + question builder) or **add learning** (article, video or sermon PDF).
  These are shortcuts: the Devotions and Learning pages each have their own **+ New devotion / + Add learning** button too.
- **Devotions** (`/admin/devotions`): add, **view**, edit or delete any devotion, including scheduled ones.
  *View* (`/admin/devotions/:id`) is the reading view: the reading as youth see it plus the questions with the answer key.
- **Learning** (`/admin/learning`): add, search (drafts included), filter by type / Bible book / tag, **view**, edit or delete items,
  and toggle Featured / Published inline. *View* (`/admin/learning/:id`) shows exactly what youth see, even for drafts.

Questions are locked after a devotion is created so existing answers stay valid; to change them,
delete the devotion and add it again. To make someone else an admin:
`UPDATE users SET role='admin' WHERE email='...';`

### Adding content via the API instead (admin token required)

```bash
curl -X POST http://localhost:3000/api/devotions \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "title": "Be Still", "publishDate": "2026-10-16",
    "passage": {"book": "Psalms", "chapter": 46},
    "keyVerse": {"book": "Psalms", "chapter": 46, "verseStart": 10},
    "body": "Be still, and know that I am God...",
    "questions": [
      {"type":"multiple_choice","prompt":"What are we told to do?","options":["Run","Be still"],"correctAnswer":"Be still","points":5},
      {"type":"true_false","prompt":"God is with us.","correctAnswer":"true","points":5},
      {"type":"open","prompt":"Where do you need stillness?","points":10}
    ]
  }'
```

You can also edit the `devotions`, `questions` and `learning_items` tables directly.

### Sermon PDFs

- Adding a sermon is two steps (the form does both): the PDF is uploaded to `UPLOAD_DIR` (default `backend/uploads`) under a random
  `<uuid>.pdf` name, then the item is saved with that name. PDFs are checked by content (must start with `%PDF-`), capped at 25 MB, and
  served at `/files/<uuid>.pdf`. Replacing a PDF or deleting/changing the item removes the old file.
- **Files are public to anyone who has the link** (the names are unguessable, but they are not behind login). That suits sermon handouts;
  don't upload anything private. Back up `UPLOAD_DIR` along with the database, and in production serve `/files` from the API's origin
  (or set `VITE_API_URL` to it) and keep the folder on persistent storage.
- A PDF uploaded but never saved (form abandoned) stays on disk; clean these up occasionally if it bothers you.

### Search notes

- Words shorter than 3 letters aren't indexed by InnoDB FULLTEXT (a server setting, `innodb_ft_min_token_size`);
  very short or common-only queries fall back to a simple `LIKE` on title/summary/tags.

## Upgrading from the earlier "Blogs" version

Learning replaces blogs and renames the tables. Fresh installs can ignore this. If you have a database from the previous version, back it up
and run the migration **once, before starting the new API** (it keeps your content, tags and saved items; blogs become articles and
excerpts become summaries):

```bash
mysqldump -u lightyouth -p lightyouth > backup.sql
mysql -u lightyouth -p lightyouth < backend/migrations/001_blogs_to_learning.sql
```

Then start the API (with `DB_SYNC=true` it creates the passages table and the new FULLTEXT index). Old items have no passages until you add them.
(`/blogs` URLs on the site redirect to `/learning`.)

## Upgrading from the previous version (Bible pickers, missed days)

This version adds columns (devotion `book`/`chapter`/`verseStart`/`verseEnd`/`keyVerse`, passage chapter/verses, and `submissions.late`).
With `DB_SYNC=true` they're created automatically on start. Then run the backfill **once** so devotions and learning passages you
already have get their structured Bible fields (it reads the old text like "1 John 1:7"; it's safe to re-run, and lists anything it
can't parse so you can fix it in the admin pages):

```bash
cd backend && npm run backfill
```

Existing answers are all treated as on time. Existing *articles* keep the summary they have until you next save them, at which point the summary is
regenerated from the text. Published items that have no tags can't be saved again until you add one.

## Google sign-in (optional)

Create an OAuth Web client in Google Cloud, add `http://localhost:5173` as an authorized origin, then set
`GOOGLE_CLIENT_ID` in `backend/.env` and `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`. The button appears only when set.

## Before production

- Set `DB_SYNC=false` and use TypeORM migrations; use a strong `JWT_SECRET`.
- Set `FRONTEND_URL` (CORS) and the frontend's `VITE_API_URL`.
- Add rate limiting (e.g. `@nestjs/throttler`) on `/auth/*`.
