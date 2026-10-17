# Start KlayKey on Windows

Double-click **start-site.bat** in this folder. It starts the configured local MySQL instance when needed, starts Express, and opens http://localhost:3000. Keep its terminal open; Ctrl+C stops the website.

This workspace already has dependencies, a seeded development database, and an ignored `.env`. Register your own customer account through the website. There is no default customer password.

## Fresh installation

Install Node.js and MySQL 8, then run these commands in this folder:

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run db:seed
npm run dev
```

The optional `db:local` helper expects MySQL at `C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe`. Set `MYSQLD_PATH` if yours differs. It creates a private development database on port 3308 without changing an existing MySQL service. It generates local secrets in ignored `.env` and `.local-mysql/credentials.json`; do not share those files.

Alternatively, copy `.env.example` to `.env`, configure your own MySQL database and credentials, and set a long random `SESSION_SECRET`. Skip `db:local`, then run migration, seed, and dev commands above. The configured database must already exist for this option.

## Try the complete flow

1. Browse Shop or Parts, search and filter products.
2. Select Start a build and register when prompted.
3. Change layout, colors, keycaps, switches, connection, lighting and module. Click the keyboard before typing to activate sound.
4. Name and save your build; reopen it from My builds.
5. Add a build or product to your bag and check out with fictional details.
6. Accept the simulation notice and view the resulting confirmation and order history.

Payments and delivery are demonstrations. No money is charged and no order is sent to a fulfillment provider. Contact messages are stored locally, not emailed.

## Troubleshooting

- Database connection failure: check MySQL is running and `.env` matches it. For the isolated database run `npm run db:local`; its logs are in `.local-mysql`.
- Port 3000 already in use: stop the previous server or change `PORT` in `.env`.
- Windows blocks file writes: allow the current Codex executable through Controlled Folder Access when developing. Do not disable Defender.
- Missing 3D rendering: use a browser with WebGL enabled. The page displays an error when initialization fails.
- Forgotten password: password recovery/email delivery is not implemented; register another local demo account.

See README.md for architecture and VALIDATION.md for verified behavior and limitations.
