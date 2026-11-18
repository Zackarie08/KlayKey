# Local admin and opening-sale setup

No deployment, Git push, SQL migration, account promotion, or database writes were performed for this feature. The SQL below is for the owner to apply manually. Browser previews use fictional in-memory data and do not demonstrate database integration.

## Apply the database changes yourself

1. Back up the intended database. Confirm its name in your database client.
2. Confirm that you own the existing active account `seangabbyperalta@gmail.com`. If it does not exist, register normally before promoting it. Do not share passwords or add a default password to SQL.
3. Review and run **`server/database/manual/admin-and-promotions.sql` once**. This changes the role enum, adds product alert/version fields, and creates promotion, audit, inventory-history, and order-note tables. MySQL DDL commits implicitly; it is not an all-or-nothing migration. If interrupted, inspect which statements succeeded and run only the remaining statements. Do not blindly rerun the entire file.
4. The final SELECT must return one active `super_admin` for the email above. If the account was absent, run only the final account UPDATE/SELECT after creating it. No password changes are needed.
5. Start/restart your local application with `npm start`, sign in normally, and open **`http://localhost:3000/admin`**. An **Admin dashboard** link also appears under My Account for staff.

This SQL is intentionally outside the automatic `migrations/` folder. Running the application or the existing migration command does not install these admin tables. Until manual installation, the storefront operates without a promotion; admin schema-dependent screens report setup pending. Existing orders, builds, product bindings and passwords are preserved.

## What is included

- Overview: all-time order value excluding cancellations, open orders, customers, inventory alerts, recent orders, and daily totals for the last 30 days. These are order values, not settled-payment accounting.
- Products: search, active/archived filter, create/edit, SKU/slug uniqueness, price, category, descriptions, image paths, compatibility choices, featured visibility and archive/restore. New products have zero stock until an adjustment is recorded.
- Inventory: per-product low-stock thresholds, positive/negative adjustments with reasons, history for admin adjustments, checkout deductions, and cancellation restocking. The balance never goes below zero.
- Categories: create and rename stable IDs. Deletion is deliberately omitted to protect product references.
- Orders: search, status filtering, immutable item/pricing snapshots, shipping/contact details, payment simulation references, internal notes and controlled fulfillment transitions. Delivery: confirmed → processing → ready-to-ship → shipped → completed. Pickup skips shipped. Cancellation is allowed before shipping and restores component stock once. Terminal orders cannot be reopened through this interface.
- Customers: lookup, contact details and latest 50 orders. Super Admins can grant/revoke Admin or Super Admin roles and disable/re-enable accounts. Staff cannot change their own access, and the final active Super Admin cannot be removed.
- Support inbox: read contact-form submissions. Sending replies is not implemented.
- Activity log: paginated admin mutation history, actor and change details. There is no API to delete audit entries.
- Opening-sale editor: headline, message, percentage/fixed discount, enable switch, optional UTC start/end, and eligible categories or individually selected products.

## Sale behavior

The manual SQL enables **10% off prebuilt keyboards** initially, with no end date. This eligibility is explicit; the discount is not site-wide. Add or remove categories/products under Admin → Opening sale. Category OR individual product selection qualifies; they never stack. A fixed amount is entered in centavos (100 = ₱1) per unit. Percentage discounts are limited to 1–90%; fixed discounts are capped at the product price.

The floating homepage card can be minimized and reopened. Minimization lasts for the browser session and resets when the promotion revision changes. “Shop eligible items” filters the catalog. Cards/product details show original prices and savings. Catalog price sorting/filtering uses sale prices. Cart and checkout recalculate eligibility/prices on the server; changing browser-submitted totals cannot set the charge. Paid/order snapshots preserve the discount that applied when the order was created.

**Excluded:** custom-builder configurations, assembly fees, shipping, past orders. Buying an eligible part directly can qualify; using that part inside a custom build does not. Starting a sale later requires reloading the homepage; an already-visible card with a near-term expiry is removed at expiry. Prices are always checked again at checkout.

## Security and data handling

Both `/admin` HTML routes and `/api/admin/*` require an active staff account. Roles are read from the database on protected requests, not trusted from the browser or cached in the session. Access changes recheck Super Admin authority inside the transaction. Existing same-origin CSRF checks and login rate limiting are retained. Admin responses use no-store. Inputs are validated server-side, SQL uses bound values, and customer/admin text is HTML-escaped in the UI.

Inventory and order transitions use transactions and row locks. Order status and product/promotion versions reject stale edits. Cancellation and checkout lock inventory in the same order. Staff mutations and their audit records commit together. This is application-level audit protection, not an external tamper-proof audit service.

Product photos can be uploaded directly in the product editor (JPG, PNG or WebP, maximum 5 MB and 25 megapixels per image, up to 8 per product). Choose the main photo or remove images before saving. Uploads are decoded, resized to at most 1800px, stripped of metadata and stored as WebP. SVG uploads are rejected. Existing bundled image paths remain supported. Uploading alone does not publish the image on a product: save the product afterward. Removing a photo from a product does not delete its stored file, preserving historical order images. Builder option bindings and component compatibility remain source-controlled because adding a product cannot create a new 3D mesh or material.

## Validation and remaining owner-run checks

Safe, database-free checks:

```powershell
node --test tests/admin-rules.test.js
npm run lint
git diff --check
```

Eight rule tests cover staff authorization, role changes, order transitions, sale eligibility, integer arithmetic, UTC boundaries, promo validation and stock input. Local browser checks use a separate in-memory fixture server, not the real database.

Verified locally: all eight rule tests and JavaScript syntax checks pass. At a 390px viewport, all eight admin sections fit without page overflow (data tables and navigation scroll within their own containers). The fixture preview verified stock adjustment from 3 to 5, promotion save confirmation, homepage card minimize/reopen, and navigation to the eligible-item catalog. No browser console errors were reported during these checks. The secret scan flags only the owner-provided email in this guide and the manual SQL; these are intentional account setup references, not passwords or tokens.

After applying SQL to an isolated development database, verify these real-database flows before deploying:

1. Guest `/admin` redirects to login. A customer receives 403 for admin HTML/API, including direct POST/PUT requests. A forged registration role remains customer. Missing CSRF token rejects writes.
2. Sign in as the designated Super Admin. Grant an existing test account Admin access; verify it can manage the store but cannot grant roles. Revoke it and verify its existing session loses admin access. Self-demotion and removing the last active Super Admin are rejected.
3. Create a product, adjust stock, set its low-stock threshold, archive/restore it, and inspect audit/history. Negative stock and stale product edits must fail. Two competing stock/checkout operations must not oversell.
4. Verify a ₱4,990 eligible item becomes ₱4,491 at 10%; an ineligible product and custom build remain unchanged. Verify mixed carts, sale-only filtering, price sorting, fixed discount greater than price, scheduled start/end and disabled promotions. Checkout must use the current server price, while existing order snapshots stay unchanged.
5. Fulfill a test order; verify invalid transitions fail. Cancel another before shipping and verify stock is restored exactly once. Simultaneous cancellation attempts must not double-restock. Check pickup completion and note history.
6. Review all admin sections and the floating card on desktop and mobile. Verify search, pagination, required fields, stale-edit messages, minimize/reopen and eligible-item navigation.

Do not run the existing full `npm test` against a production database: its commerce tests create/update test records and require a `_dev` database. No full database regression run was performed as part of this task because the owner requested SQL-only database changes.

This remains a demonstration store. Live payment/refund processing, tax/accounting, courier integrations, email delivery, MFA, return/refund workflows and external audit retention are not added by this change. Treat these as separate production-readiness work, not capabilities implied by the dashboard.

## Persistent product image storage

No SQL changes are needed for uploads; the existing product images JSON stores their URLs. Local development uses the ignored uploads/ folder. On Railway, attach a persistent volume to the **web application service**, mounted at /data, and set UPLOAD_DIR=/data/product-images on that same service before deploying. The MySQL service volume does not store web application uploads. Production uploads deliberately return a setup message until UPLOAD_DIR is set. Do not point it at an ephemeral application folder. Back up the upload volume along with the database. This filesystem implementation is intended for a single application instance; shared object storage is needed before scaling across independent instances.

The upload endpoint requires an active Admin/Super Admin and the existing CSRF token, limits requests to 20 per minute per IP, rejects oversized payloads and uses generated filenames. Product image files themselves are public so shoppers can see them. Orphaned uploads are retained; automated cleanup is not included.
