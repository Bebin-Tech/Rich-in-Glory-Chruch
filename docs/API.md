# REST API

All API responses are JSON. Errors return `{ "error": "message" }` with appropriate 4xx/5xx status. Obtain `/api/session` before writes and send its `csrf` value as `X-CSRF-Token`; retain the session cookie. Successful login rotates the CSRF token. Production uses same-origin HTTPS; arbitrary CORS origins are not enabled.

| Route | Methods | Access / purpose |
| --- | --- | --- |
| `/api/session` | GET | Session user and CSRF token |
| `/api/register` | POST | Member-only account creation; role input ignored |
| `/api/login`, `/api/logout` | POST | Login/logout |
| `/api/settings` | GET | Public church configuration |
| `/api/content/{module}` | GET | Published listing, q/category/page/size |
| `/api/content/item/{id}` | GET | Published content detail |
| `/api/prayer`, `/api/contact` | POST | Consent-based private intake; no public read route |
| `/api/events/{id}/register` | POST | Registration for an open published event |
| `/api/progress` | GET | Signed-in user's reading history |
| `/api/progress/{reading_id}` | PUT | `{completed: true/false}` for own progress |
| `/api/admin/overview` | GET | Counts limited to role |
| `/api/admin/content/{module}` | GET/POST | Admin/editor list/create |
| `/api/admin/content/item/{id}` | PUT/DELETE | Admin/editor update/delete |
| `/api/admin/settings` | PUT | Administrator only |
| `/api/admin/uploads` | POST | Admin/editor image; multipart `file` |
| `/api/admin/private/{module}` | GET | Prayer/contact/registrations/users/audit; role checked |
| `/api/admin/private/{module}/{id}` | PUT/DELETE | Request status or confirmed delete |
| `/api/admin/users` | POST | Administrator creates member/staff |
| `/api/admin/users/{id}` | PUT | Administrator changes role |

Content modules: about, leadership, services, sermons, events, verses, reading, studies, albums, photos, videos, articles, messages, faqs.

Create/update body: `title_en`, `title_ta`, `body_en`, `body_ta`, `category`, `status`, `publish_at` (ISO date or empty), `sort_order` (integer), `parent_id` (album ID for photos or null), and `data` (module details). Status is draft/published/archived. Required publishing fields: events date; verses month/reference/translation and rights_confirmed=true; reading date/reference. Media uses HTTPS or sanitized `/uploads/` paths; video uses allowed YouTube hosts. Display bodies are escaped plaintext.

Private intake: name, contact, message, category (prayer only) and consent=true. Prayer identity/contact optional. Event intake: name/contact/consent=true. Deletes require `{confirm:true}`. Prayer/contact statuses are New, In Progress, Completed.
