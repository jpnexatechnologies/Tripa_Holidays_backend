# Spring Boot to Express and MongoDB conversion notes

- `@RestController` mappings are implemented as Express routers and retain the `/api/...` route families.
- Spring repositories and the prior MySQL query layer are replaced by MongoDB collections accessed through the official Node.js driver.
- Existing numeric API IDs are retained as numeric MongoDB `_id` values; a counters collection allocates IDs for new documents.
- JWT authentication, role checks, and password hashing use `jsonwebtoken` and `bcryptjs`.
- JavaMailSender is replaced with Nodemailer.
- Package image, inclusion/exclusion, and tour-plan values are stored as native document fields rather than MySQL JSON columns.
- Vercel serves the Express app through `api/index.js`; MongoDB connections are lazy and cached for warm function reuse.
- Existing MySQL records are not automatically migrated. Back up, map, import, and validate the records before production cutover. See the README data migration section.
- Admin-only mutation routes remain protected.
