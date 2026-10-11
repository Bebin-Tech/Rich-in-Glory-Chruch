# Rich in Glory Church

React 19 + Vite + Tailwind CSS, Flask, SQLAlchemy, MySQL, Alembic migrations and Waitress. Tamil and English public pages and a separate staff dashboard share real database records. The supplied Google share link resolves to the Rich in Glory Church listing in Irugur. The verified address and three credited church photos are included in a bright ivory, forest-green and gold design. Phone numbers, schedules and pastor identities remain unfilled until verified. See docs/CHURCH_SOURCES.md for provenance.

## Windows PowerShell setup

Install Python 3.12+, Node 22+, and MySQL 8.0+ (or Docker Desktop). Open PowerShell in this directory:

```powershell
python -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
Set-Location frontend
npm install
npm run build
Set-Location ..
```

Edit `.env`: set a random `SECRET_KEY`, `APP_ENV=development`, `PUBLIC_ORIGIN=http://127.0.0.1:5000` and the MySQL `DATABASE_URL`. Percent-encode special characters in the database URL password. For Docker, set `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` in your terminal, then `docker compose up -d mysql`. Use those same credentials in the URL.

For the existing Windows MySQL installation, this optional helper creates a **separate development instance on port 3307** inside the ignored `.local-mysql/data` directory. It leaves installed database services alone and writes generated development credentials to ignored local files:

```powershell
& .\.venv\Scripts\python.exe scripts/local_mysql.py
```

Run it once per computer restart if you choose this development instance. It needs permission to run MySQL and bind loopback. Do not run it again while its instance is running. Its PID is recorded in `.local-runtime.json`; after checking that PID belongs to `mysqld.exe` with a command line containing this project's `.local-mysql/data`, stop only that process. Never commit `.env`, `.local-runtime.json`, `.local-mysql`, or backups. Use managed MySQL for production.

Apply the migration and create your first administrator using a hidden interactive password prompt:

```powershell
& .\.venv\Scripts\python.exe -m flask --app backend.app:create_app db upgrade -d backend/migrations
& .\.venv\Scripts\python.exe -m flask --app backend.app:create_app setup-admin
& .\.venv\Scripts\waitress-serve.exe --listen=127.0.0.1:5000 --call backend.app:create_app
```

Open `http://127.0.0.1:5000`. Sign in directly through `/admin` for the dedicated staff workspace, or through `/account` for member/staff sign-in. There are no default passwords or public administrator registration. New installations begin empty; the current local database includes verified listing information and credited photos. Every dashboard count reflects actual records. Publish approved church content to populate the public pages. Fill in contact settings, leadership and service times before launch. Giving remains disabled until a staff administrator explicitly confirms the payment link.

`scripts/start.ps1` applies migrations and starts Waitress. For frontend development run Flask on port 5000 and `npm run dev` from `frontend` in a second terminal. Set `PUBLIC_ORIGIN=http://127.0.0.1:5173` for the Vite origin; its proxy serves API calls with the Flask session.

## Modules and editing

- About: introduction, history, mission, beliefs and ministry content; separate leadership and service records.
- Sermons: preacher, Scripture, date, thumbnails, YouTube videos, categories and featured marker.
- Events: date, time, venue, registration toggle and private registration records. Past events cannot accept registration; duplicate contact/event pairs are rejected by a database constraint.
- Monthly verses: month, Scripture reference, translation attribution and bilingual verse text. Publishing requires an explicit rights confirmation. Current verse, archive, copy and WhatsApp sharing use the saved content.
- Reading: dated passages and plan name, authenticated completion history, weekly/monthly counts and database progress unique to each member.
- Studies: book, chapter, passage references, notes and discussion questions.
- Photos/albums: validated uploads, album relationship and lightbox. Use an album's ID when organizing photos in the editor.
- Videos: authorized YouTube URLs, categories, date, thumbnails and descriptions. Videos are embedded from YouTube with privacy-enhanced hosting.
- Articles: author, date, image, category, bilingual long-form text, search and pagination.
- Messages: important flag, date, optional HTTPS attachment, scheduled publication and archives.
- FAQ: bilingual question/answer, category, search, display ordering and accordions.
- Prayer: optional identity/contact, consent and private staff inbox with New/In Progress/Completed states.
- Contact: configurable details and consent-based enquiries; donation links require verification.

Use English and Tamil fields independently. An absent Tamil field falls back to English; this is not automatic translation. Category names and detailed metadata are entered by the church. Text bodies preserve paragraphs and support `##` section headings and `-` lists; React escapes text to prevent stored HTML injection. YouTube URLs are validated; unsupported hosting needs a new reviewed adapter. Uploads are limited to 8 MB and 20 megapixels, decoded and re-encoded as WebP with randomized filenames and stripped metadata. Deleting a gallery record removes its public listing; the shared asset remains on disk to avoid deleting an image used elsewhere. Periodically remove unreferenced media after a backup.

Content has draft/published/archived states, scheduling and display ordering. The public API returns only published records whose publication date has arrived. The dashboard supports searching, status filtering, pagination, publish/unpublish/archive, editing and confirmed deletion. Scheduled dates are day-based. The application timezone should be set to Asia/Kolkata on the deployment host.

## Roles

| Role | Permission |
| --- | --- |
| Member | Public content and own reading progress |
| Editor | Content CRUD and images; no prayer, enquiry, user or audit access |
| Prayer | Prayer inbox only |
| Admin | All modules, private inboxes, registration records, settings, users, roles and audit logs |

Only administrators create staff accounts. The last administrator cannot be demoted. Passwords use Werkzeug scrypt hashing. Sessions are signed, HTTP-only and SameSite Lax. Server-side authorization rechecks each user's current role for each request. All writes require a session-bound CSRF token and approved Origin; cross-origin CORS access is deliberately absent. Login, registration and public form routes are rate limited. Private API responses disable caching. Audit records store action IDs rather than prayer text or passwords.

## API

See [docs/API.md](docs/API.md) for routes. The bilingual content tables use a common publishing envelope plus validated JSON metadata rather than duplicating identical schemas per feature. MySQL migrations include foreign keys, uniqueness constraints, timestamps and indexes. The authoritative schema is the Alembic migration in `backend/migrations/versions`; `docs/schema.mysql.sql` provides the generated MySQL schema for review. Use migrations, not both schema import and migrations, for installation.

## Automated verification

```powershell
& .\.venv\Scripts\python.exe -m pytest -q --basetemp=.pytest-tmp
Set-Location frontend
npm run build
Set-Location ..
# When using the isolated local MySQL helper:
& .\.venv\Scripts\python.exe scripts/verify_mysql.py
```

Tests use an isolated in-memory SQLite database by default. MySQL tests use `rich_in_glory_test` and **clear its tables**; never point them at production. Tests cover CSRF, authentication, role escalation prevention, publication, Tamil search, scheduling, verse rights, uploads, SQL injection, duplicate registrations, private prayer data and member progress isolation. See `docs/VERIFICATION.md` for results recorded during delivery.

## Production deployment

This stack requires a Python/MySQL host; Cloudflare Sites cannot execute Flask or a MySQL server. No deployment account or domain was supplied. Deploy with these steps:

1. Provision a private MySQL database with utf8mb4, encrypted disks, encrypted backups and TLS; configure SQLAlchemy connection TLS arguments for your provider. Grant the migration account DDL access and the serving account only necessary table DML access after applying migrations.
2. Build React with `npm ci && npm run build`. Flask serves the build and uploads on the same origin.
3. Set `APP_ENV=production`, a random 32+ character secret, the database URL, `PUBLIC_ORIGIN=https://your-domain`, and shared rate-limit storage such as `redis://...`. The Redis adapter dependency is included; provision a Redis service when using it. The app refuses production startup with SQLite, a weak secret, or process-local rate-limit storage.
4. Run `flask ... db upgrade`, then `setup-admin`. Do not place passwords in command arguments or shell history. Choose strong staff passwords at creation and distribute them privately; email-based password recovery is not implemented.
5. Run Waitress behind an HTTPS reverse proxy on loopback. Preserve same-origin paths. Configure service restart, resource limits, encrypted persistent uploads storage, health checks and DB monitoring. Avoid logging request bodies, cookies or authorization headers. Forward client IP only from a trusted proxy; configure a reviewed trusted-proxy policy before enabling IP-based distributed rate limiting.
6. Redirect HTTP to HTTPS, verify secure cookies, CSRF, prayer privacy, contact details, Bible translation rights, image rights and mobile layout. Approved external social/map/payment links open in separate tabs. There is no payment processing or payment-success assertion.
7. Uploads currently use persistent disk. To move to cloud storage, implement an authenticated storage adapter, sanitized re-encoding and access controls before a multi-host rollout. Do not assume ephemeral hosting retains uploads.

## Backup and restore (PowerShell)

Use MySQL's `--result-file` to avoid PowerShell redirection encoding issues. Keep credentials in MySQL's prompted `-p` option or a secured login path:

```powershell
New-Item -ItemType Directory -Force backups
& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe' -h 127.0.0.1 -P 3306 -u church -p --single-transaction --routines --triggers --result-file=backups\church.sql rich_in_glory
Copy-Item -LiteralPath backend\uploads -Destination backups\uploads -Recurse
# Restore into a separately provisioned empty database first:
& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' -h 127.0.0.1 -u church -p rich_in_glory_restore --execute="source backups/church.sql"
```

Back up the database, media and secret configuration securely. Test restores and table counts in staging; switch production only after verification and a maintenance window. Restrict backup access because backups include private prayer and enquiry records. Store encrypted off-device copies with documented retention and rotation. Local development uses port 3307; adjust commands accordingly.

Review completed private requests and purge after the church's approved retention period:

```powershell
& .\.venv\Scripts\python.exe -m flask --app backend.app:create_app purge-private --days 90 --confirm
```

Run this daily through a secured task scheduler; it removes only completed old prayer requests and contact enquiries. Align backup expiry with the retention policy. Staff should regularly review new/in-progress requests; active requests are not automatically discarded. Confirm local privacy requirements before launch.
