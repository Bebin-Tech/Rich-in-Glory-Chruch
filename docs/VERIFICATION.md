# Verification record — 11 October 2026

- React production build succeeded with Vite. Dependency audit reported no frontend vulnerabilities at installation.
- Alembic initial migration applied successfully to an isolated MySQL 8.0.46 database on loopback port 3307, using utf8mb4.
- 13 initial tests passed against SQLite; 15 tests including collection filters and future verse visibility passed against MySQL after backend refinements.
- Browser verification used a separate, disposable in-memory SQLite server on port 5001 with clearly labelled synthetic data. Main MySQL church content was not seeded with invented records.
- Verified staff sign-in, dashboard counts, bilingual article creation, publishing, public article visibility, Tamil detail view, prayer form submission and private confirmation, and reading completion persistence after reload.
- Inspected desktop homepage, Tamil desktop homepage, 390-pixel mobile Tamil layout and mobile menu, and an 820-pixel tablet layout with no horizontal overflow. The handoff includes a saved homepage screenshot.
- Initial administrator creation is intentionally left to the church using the secure interactive `setup-admin` command. The main application has no default login.

## Remaining operational setup

Supply approved church content, verified contact information, authorized Bible translations, church photography, service schedules and staff accounts. The Google share link was subsequently resolved through the browser. The verified address and three credited photographs have been imported; see CHURCH_SOURCES.md. Donations remain disabled.

Hosting, HTTPS reverse proxy, managed database TLS, shared rate-limit storage, backups, scheduled retention cleanup and cloud-media adapter (if needed) require the church's deployment environment. No public deployment was performed. Third-party YouTube playback and actual payment-provider behavior were not tested because no authorized video or payment links were supplied. The application embeds configured Google Maps links as external navigation; it does not infer a location.

## Data design

Publishing modules use one indexed bilingual `content` table with validated metadata and an album parent relationship. Private intake, registrations, users, audit logs, settings and reading progress have separate tables and database constraints. This intentionally differs from the brief's proposed one-table-per-content-module schema while providing working CRUD for each module. Rich text supports paragraphs, `##` section headings and `-` lists, escaped through React; unrestricted HTML is not accepted.


## Bright design update — 11 October 2026

Production frontend build passed. All 15 MySQL integration tests passed. Browser inspection covered desktop at 1440px and mobile at 390px, English and Tamil, verified location on the visit page, and all six homepage photo instances loading. No browser console errors were reported. The updated design uses warm ivory surfaces with forest-green and gold accents.


## Complete admin redesign — 11 October 2026

- Shared premium light admin shell covers overview, all 14 publishing modules, prayer inbox, enquiries, registrations, settings, users and audit.
- Dedicated staff login at /admin; /account keeps member registration and sign-in. Existing credentials, roles, CSRF and MySQL architecture preserved.
- Fixed-height viewport shell keeps navigation and top bar stationary. Content, sidebar navigation, horizontal table overflow and long dialogs have separate bounded scroll containers. Mobile drawer closes on module selection.
- Removed request-per-keystroke searches with 300ms debounce; abort superseded fetches; reset filters in the module-selection event to avoid stale-filter fetches; load album options only in photo editors.
- Overview content counts now use one GROUP BY query rather than fourteen count queries. Regression test measures this query count. Record pages remain limited to 20 rows. Thumbnail images are lazy loaded; no large decorative admin imagery.
- All 18 integration tests passed against isolated MySQL, including CRUD for each content module, permissions, private search and pagination, and grouped overview counts.
- Browser inspected every module and opened Add forms for all 14 content modules. Disposable SQLite QA verified staff login and article create/edit/view plus delete confirmation cancellation. Actual church records were not edited by these UI tests.
- Desktop, 820px tablet, and 390px mobile checks found no document horizontal overflow. Mobile gallery uses contained horizontal table scrolling. Long editor measured 670px viewport with 1220px scrollable form content. Page height matched viewport; navigation remained at top coordinate 0.
- Login password-toggle and mobile inherited-style conflicts found during QA were corrected before delivery. Final production build passed.
