# Activate the SeoSonas Owner’s Studio

The owner studio is implemented at `/admin/`. Publishing from it updates Netlify Blobs; the storefront, image lists, order options and sitemap read the published catalogue on each request. No deployment is needed for those content changes after initial setup.

## One-time activation on the existing Netlify site

1. Deploy this repository to **the existing site for seosonas.co.uk**. Use Node 22.12 or later, build command `npm run build`, publish directory `dist`, functions directory `netlify/functions`. These settings are already in `netlify.toml`. Use Netlify's normal production build with `CONTEXT=production`; the build records the context to keep production and preview data separate. Do not upload `dist` alone using drag-and-drop: this application also needs its Functions.
2. Enable **Netlify Identity** for the site. Under Identity → Registration → Registration preferences, choose **Invite only**. This code does not expose a signup endpoint or assign admin roles automatically.
3. Invite the owner's email under Identity → Users. Assign the invited user the **`admin`** role through the user's Netlify settings (`app_metadata.roles`, not editable profile/user metadata). Do not share Netlify account passwords with the owner or add API tokens to the browser code.
4. The owner opens the invitation email, chooses a password, and signs in at **https://seosonas.co.uk/admin/**. The home page forwards invitation/recovery fragments to `/admin/`. If using custom Identity email templates, their links must carry `#invite_token=…` or `#recovery_token=…` to the site or `/admin/`. Set the Identity site URL to the production HTTPS domain. Password recovery is available on the sign-in screen. After changing roles, sign out and in to refresh the session.
5. Enable Netlify Forms detection and check the deploy discovers `faeries-order`, `wish-witches-order`, `kitchen-witches-order`, `fictional-characters-order`, and `more-interest`. The declarations stay in the generated static `dist/order.html` for build-time detection. Submission is sent to `/order-received.html`, which is intentionally a static path outside the catalogue Function.
6. Open the studio and save the initial draft. The first read starts from all existing products, photographs and price links bundled at build time. Check the draft preview and enabled Lopay totals, then publish. The site-wide Blob store is provisioned automatically by Netlify; no manually pasted access token or database is required.
7. Verify a deployed preview first: owner sign-in, ordinary visitor rejection at `/api/admin`, a test draft/photo, publication, rollback, and order-form receipt in Netlify. Do not complete a real payment merely to test routing. Live Identity email delivery, Netlify Forms processing and hosted Blobs need this deployment-level smoke test; the local demo does not verify those services.

The repository is not currently linked to a Netlify site by a `.netlify/state.json` file. This implementation has not deployed, invited an owner, changed account settings, sent emails or changed live content. Link/deploy using the existing site's normal Git workflow or Netlify CLI account access.

## Everyday owner workflow

- **New product:** click “New product”, enter a name and unique lowercase hyphenated ID, choose an existing collection, write its description, and mark it visible when ready.
- **Edit or hide:** select a product. Clear “Visible in the shop” to hide it. Remove from draft to delete it from the next published catalogue. Stable IDs preserve existing product anchors.
- **Photographs:** add JPEG, PNG, WebP or GIF files up to 4 MB each. Multiple files are appended in filename order. Use the arrows to reorder; the first is the lead photo. Remove takes a photo out of the gallery; it does not destroy its stored file or previous backups. Uploads can be viewed only by admins until included in a published visible product or collection.
- **Collection photographs:** edit the shared home-page/category gallery separately from individual products.
- **Prices:** edit the existing category/quantity offers and delivery. A product uses its collection's pricing; individual per-product price exceptions are not supported. Disabled options stay unavailable. More remains an enquiry-only category. Update Lopay separately, then check every enabled link against the full displayed total including delivery. Save the draft, tick the acknowledgement, then publish. Changing a displayed price does not change what Lopay charges.
- **Save draft:** validates and stores changes privately. Preview uses the saved draft, so save before previewing. Order submission is disabled in draft previews. Links inside a preview can lead to the live shop; the yellow draft banner identifies the preview page.
- **Publish saved draft:** replaces the live catalogue atomically. Customers see changes on their next page request; it does not remotely refresh an already-open page. An already-open order page is checked against the current published revision and asks the shopper to reload if anything has changed.
- **History:** the previous 30 published versions are available to restore into the draft. Review and publish the restored draft to roll the shop back. Saving a draft alone does not create a historical snapshot.
- **Backups:** download/import the catalogue JSON from “Backups & history”. A JSON backup references photos; it is not a complete offline media archive. Retain original photo files and export Blob media separately for full disaster recovery. Imported references must exist in the same deployment/store; importing a production backup into a preview environment requires uploading its media there too.

If another tab/person saves first, the studio returns a conflict instead of overwriting their work. Download your unsaved draft, reload the latest version and reapply the changes. Avoid editing in several tabs simultaneously.

## Storage and safety

- The production store is `seosonas-catalogue-production`. Deploy previews are isolated by review ID; branch deploys by branch name; local builds use a local namespace. Context is pinned at build time, not inferred from a request. Seed content does not silently replace published content on subsequent deploys.
- A single `state` document contains the draft, published snapshot, publication revision and history index. Saves/publications use strong-consistency reads and atomic ETag-conditional writes. Backups are immutable `history/<UUID>` objects written before publication. Failed concurrent publications can leave an unreferenced backup, but cannot partially publish.
- Uploads use immutable random IDs under `media/`. Deleting/replacing a gallery reference keeps the underlying upload so rollback works. Unreferenced uploads and history beyond the newest 30 are retained; there is no automatic destructive cleanup. Storage usage will grow slowly and should be reviewed occasionally in Netlify.
- Existing filesystem images remain in the deploy and are publicly accessible even when a product is hidden; hiding catalogue entries is not a file privacy feature. Do not delete source image files still referenced by live content/history.
- Every draft, preview and upload request checks authenticated Identity `admin` role server-side. Mutations additionally require a same-origin Origin header. Data is validated and HTML-escaped; image uploads reject SVG/HTML and unsupported signatures. The admin does not expose role management.
- Drafts never appear in the public catalogue API, sitemap or normal storefront. Published pages and media use `no-store` responses so changes cannot linger in a CDN cache. This prioritizes immediate correctness for a small shop; Function/Blob requests count toward the site's Netlify usage.
- Public pages are rendered by a Function from the current published snapshot, preserving crawlable HTML, canonical metadata, image links and search navigation. On storage failure the service returns an error rather than silently selling from stale data.
- The deployment publishes only `dist/`; backend source, dependencies, tests, generated seed bundle and local demo are outside the public directory.

## Local verification

```sh
npm ci
npm run build
npm test
netlify functions:build --src netlify/functions --functions /tmp/seosonas-functions-build
npm run demo:admin
```

The disposable demo opens at **http://127.0.0.1:5180/admin/**:

- Email: `demo@seosonas.test`
- Password: `local-demo-only`

It binds only to the local machine, uses temporary memory, has no Netlify credentials and disables actual orders/payments. Restarting loses its content. Those demo credentials are not accepted by production Functions. The server is excluded from deployment.

For real provider integration, link the repository to the correct Netlify site and use `netlify dev` or a deploy preview with Identity configured. Do not add test-auth bypasses to production Functions. The ordinary `npm run dev` preview is static and cannot exercise this backend.

## Scope

Products, product descriptions, visibility, ordering, galleries, category price options and delivery can be managed without redeploying. New categories, editorial home-page copy, templates, navigation design, SEO metadata and code still use the repository/deployment workflow. The existing Netlify Forms + Lopay flow remains; no basket or custom payment processor has been added.

References: [Netlify Identity server-side authentication](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/use-identity-in-functions/), [invite-only registration](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/registration-login/), [Blobs conditional writes and consistency](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).
