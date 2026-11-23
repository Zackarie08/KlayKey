# Christmas 2026 and first-purchase offers

These changes are local only. No database migration, push or deployment was performed.

## One-time manual setup

The existing admin tables must already be installed. Do **not** rerun the old `admin-and-promotions.sql` on your configured database.

1. Back up the intended database.
2. Open your MySQL client, select `klaykey` (`USE klaykey;`) and run the contents of **server/database/manual/christmas-2026.sql** once. If using Railway's console, enter MySQL first; SQL is pasted at the `mysql>` prompt, not the Linux shell prompt.
3. The final SELECT results should show promotions 1 and 2, and the Noël 75 product with price 499000 centavos and initial stock 50. If an existing Noël product is found, its stock and price are preserved.
4. Run/deploy the updated application files yourself. No environment variables or new packages are needed for this feature.
5. Sign in as an Admin or Super Admin. Open `/admin?view=campaign` for Christmas settings; `/admin?view=promotion` controls the first-purchase card. The Christmas editor links to the limited product's normal product/stock editor.

The ALTER statement is intentionally one-time, outside the automatic migrations folder. If interrupted after ALTER, inspect the added columns before continuing with the transaction portion; do not rerun ALTER blindly. Application startup never executes this SQL.

## Default behavior

- **Christmas preview:** visible from November 23, 2026, Philippine time. Automatically opens once per browser-tab session and campaign revision on the homepage, catalog, product pages and builder. Close or Escape dismisses it; the gift button below the upper-right navigation reopens it. Checkout, account, login and admin pages are not interrupted.
- **Sale period:** December 1, 2026 at 00:00 through December 31 at 23:59:59 Philippine time. The editor's exclusive end is **January 1, 2027 at 00:00**. SQL stores UTC (November 30 at 16:00 to December 31 at 16:00).
- **Christmas discount:** 15% on selected products and custom builds. Initially the selected product is Noël 75; select additional products/categories in admin. Custom-build assembly fees and delivery charges are excluded. Eligible build parts and other configured build options receive the discount.
- **Noël 75:** 75% layout, pine-green case, ivory/cranberry/evergreen keys, linear switches, tri-mode connectivity with cable, base price ₱4,990, 50 initial units. Its original SVG artwork is `public/assets/images/noel-75.svg`. Sale price at 15% is **₱4,241.50**. Stock remains real inventory, editable by staff; it is not replenished automatically. Stock availability is checked again during checkout.
- **Limited release:** visible for preview but cannot be added to cart/purchased outside the campaign sale dates, when disabled, when setup is missing, or when sold out. The featured product ID preserves the restriction if staff rename its slug. Expired campaigns disappear; the product remains in the catalog as unavailable until staff archive it.
- **First-purchase card:** 10% on selected direct-purchase products (existing eligible selections preserved). Guests are invited to sign in. Any successfully created order consumes account eligibility, even if that order used a better Christmas discount, contained no eligible items, or is later cancelled. Failed checkout attempts do not consume eligibility. Users with prior orders no longer receive the card or discount. Custom builds are excluded from this offer.
- **No stacking:** the single best eligible discount is chosen independently for each item. Both offers may appear on different lines of one order, but never compound on one line. Shipping is never discounted. Server prices, stock and eligibility are recalculated for cart and checkout; existing order snapshots remain unchanged.
- Admin edits retain role/CSRF protection, optimistic revision checks and readable audit entries. The fixed first-purchase percentage is enforced server-side. Christmas percentage, message, dates, preview, product/category eligibility and build inclusion are editable.

## Validation and remaining checks

Focused automated tests cover Philippine-time boundaries, preview visibility, missing setup, stock and expiry restrictions, best-offer arithmetic, assembly exclusion, first-purchase eligibility and cart revalidation. Existing admin rules and custom color tests also pass, along with keyboard asset tests and lint.

The manual SQL has **not** been executed. Real MySQL integration, concurrent checkout and persisted admin edits still need verification against an isolated development database. The attempted local browser preview was blocked by the tool's automatic approval review due to a usage limit; desktop/mobile visual checks and modal close/reopen checks have **not** been verified in a browser.

Before publishing, check the popup at desktop and mobile widths in both themes; close with X/Escape and reopen with the gift icon. Verify a new account receives 10%, an account with orders does not, and an eligible December cart receives 15% without stacking. Test preview/start/end and sold-out cases in an isolated database by changing the campaign schedule. Do not modify the live clock or run checkout test suites against production.

## Compact popup and 3D product preview update

The popup now records dismissal before promo-link navigation and records an initial impression per tab. Product detail pages do not auto-open the popup; their gift button still opens it manually. The landscape layout adapts to mobile and scales down for short viewports without an internal scrollbar.

Both the popup and limited product page use the existing 75% GLB with pine-green case, ivory/cranberry/evergreen keycaps, warm lighting, gold knob and a Noël front badge. Drag or arrow keys rotate the preview. Original product images remain as a WebGL/load fallback; the product gallery and View in 3D button switch views. Only the preview mesh and Three.js library files are served publicly; builder APIs retain their existing protection. No additional SQL is needed for this update. Browser visual validation remains pending.
