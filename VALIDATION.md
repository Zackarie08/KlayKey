# Validation record — 16 October 2026

Environment: Windows, Node 22.20.0, installed MySQL 8 running an isolated development instance on loopback port 3308, and the Codex in-app Chromium browser. Real database queries and transactions were used; the commerce backend was not mocked.

## Automated checks

- `npm test`: 13 passed, 0 failed (one parent suite and 12 substantive subtests). Re-run after adding the development-database safeguard.
- `npm run test:assets`: 9 passed, 0 failed.
- `npm --prefix keyboard-3d run validate`: all three GLBs have 0 errors and 0 warnings.
- Existing viewer's Run asset checks, after clicking Start Typing Test to unlock audio: **273/273 passed**. No captured console warnings or errors. Includes all layouts, finishes, themes, switches, materials, RGB, connections, module visibility, key animation/reset, keyboard events, knob state and nine synthesized acoustic profiles.
- An earlier run without the audio gesture stopped on a focus-loss assertion on the 100% layout (219/221). The subsequent audio-enabled full run passed. Background-tab focus behavior remains a browser-dependent consideration; this report does not hide the initial failure.

The 13 commerce tests verify public/protected routes, catalog filters/search/sorting/pagination, CSRF and origin checks, registration/password hashing/customer roles, login/logout/session regeneration, ownership isolation, compatibility validation, saved-build CRUD, mixed carts, trusted server pricing, stock rejection, transaction rollback, immutable orders, idempotency, all three simulated payment choices, profile/contact persistence and cart clearing.

## Browser workflows actually exercised

- Guest builder access redirects to login with a return destination; registration resumes the builder.
- Changed the builder to 60%, purple/charcoal, blue clicky switches and mini display; typed a physical key; saved and reopened the same configuration after restarting the application.
- Added that custom build to the cart and checked out using fictional shipping data and simulated GCash. Confirmation displayed order `KK-20261016-C4262EEDEA`, total PHP 7,464; bag cleared and order appeared in history.
- Added an individual switch from its product detail page; cart and checkout displayed it.
- Search for tactile products and category/layout filters narrowed the catalog to one matching prebuilt product.
- Mobile menu opens and closes with Escape.
- Home, shop, product detail, builder, cart, checkout, account and order-history pages were measured at widths **360, 390, 768, 1024, 1366 and 1920**. Document content did not overflow horizontally. Mobile builder/checkout and desktop home were also visually inspected. Builder step navigation intentionally scrolls inside its own row.
- The Windows startup script was executed with `-NoBrowser`: it connected to the existing isolated MySQL instance and started the website successfully on port 3000. Its browser auto-open branch was not separately exercised.

## Limits of verification

These checks cover local Chromium, not Safari/Firefox or physical mobile hardware. No production load test, real payment, email delivery, shipment or hosted deployment was attempted. WebGL-disabled fallback text exists but was not tested with hardware acceleration forcibly disabled. Existing Blender source and GLBs were retained; no new Blender regeneration was needed for this storefront work. Audio was validated through its browser checks and state, not through a subjective listening review. Browser test records are fictional local records. See START_HERE.md to create your own customer account.
