# Vercel deployment

Production: https://rich-in-glory-church.vercel.app

Admin: https://rich-in-glory-church.vercel.app/admin

Deployed on 12 October 2026 with free Aiven MySQL and Valkey in Bengaluru and public Vercel Blob storage in Mumbai. Production service credentials are stored in Vercel; one-time administrator initialization variables were removed after verification.

Use the repository root, Flask framework, Python 3.12, and the committed vercel.json. The build creates the React production bundle and copies it into public/ for CDN delivery and web_dist/ for function-based SPA and generated-asset fallback. Vercel discovers public assets before the custom build, so web_dist/ keeps newly generated files and direct page links available on fresh checkouts. app.py exports the Flask WSGI instance. Public routes return the SPA index, while existing /api routes continue using Flask on the same origin.

## Required services and environment

- APP_ENV=production
- SECRET_KEY: a fresh random secret with at least 32 characters
- DATABASE_URL: hosted MySQL SQLAlchemy URL (mysql+pymysql://...), with percent-encoded credentials
- MYSQL_SSL_CA: provider CA PEM if its certificate is not signed by a public CA; TLS verification stays enabled
- RATELIMIT_STORAGE_URI: hosted Redis/Valkey TLS URL (rediss://...)
- PUBLIC_ORIGIN: exact final HTTPS production origin
- MEDIA_STORAGE=vercel_blob
- BLOB_READ_WRITE_TOKEN: supplied through the connected Vercel Blob store

Keep all secrets in Vercel environment settings. Never upload .env or point the cloud app at localhost. A new cloud database requires migrations and an administrator setup; existing local account passwords and private records are not transferred automatically.

Run the Alembic migration once against the hosted database from an authorized secure environment before serving traffic. Do not run migrations inside request handlers. The verified church listing can be imported with scripts/import_church_listing.py after migration. Configure a real church administrator account separately.

Only validated, resized, re-encoded public church images go to the Blob store. Prayer and enquiry data remain in the authenticated MySQL API. The local disk upload adapter continues to work for local development. Source images up to 8 MB are optimized in the browser when necessary to fit the Vercel request limit; server-side validation remains in place.

Before launch, verify sign-in, all admin modules, publication, images, prayer privacy, reading progress, and external contact links against the real deployed URL. Provision no paid plan without the church’s approved budget. Provider account creation, verification, and terms acceptance may require user participation.

For the first deployment only, set INITIALIZE_CHURCH_DATABASE=1, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD_HASH (Werkzeug scrypt hash) securely in Vercel. The build-time initializer acquires a MySQL lock, applies Alembic migrations, creates the administrator only if absent, and imports the verified public listing. It does not overwrite an existing account or migrate private requests. Remove these three bootstrap variables after verification.

## Deployment verification

Hosted administrator authentication, all 14 content modules, five private management modules, and dashboard counts passed. Unauthenticated admin access returned 401. Homepage, /admin, /about, CSS, JavaScript, and original church images returned 200. A real public church image uploaded with status 201 and the stored WebP returned 200. Browser sign-in reached the administrator dashboard with no captured console errors. All 20 backend tests passed.

Deploy with the official Vercel CLI from the repository root (`vercel deploy --prod`). GitHub push automation is not connected: Vercel could not access the repository through its GitHub integration. CLI deployments remain available; no service secrets are committed.
