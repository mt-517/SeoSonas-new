# SeoSonas catalogue

The site stays a simple static site, with no basket. All 54 existing products are now managed in `data/products.json`. Their pages and navigation are generated from that file; galleries share an automatically generated image index. Existing Netlify Forms and Lopay payment links remain in place.

## Everyday editing

1. Add photographs to `images/<category>/<product-id>/`, for example `images/faeries/autumn-fae/img1.webp`.
2. Run `npm run build`, or let Netlify run it when you push the changes. The build scans the folders and updates every gallery. No individual image URLs need editing.
3. Preview with `npm run dev`, then open http://localhost:5173. Run the build again after changing photographs or product data, and refresh the page.

Supported images: WebP, AVIF, JPEG, PNG and GIF. Names sort naturally: `img1`, `img2`, `img10`. Use lowercase, hyphenated product IDs. Existing collection photographs have their own `images/<category>/collection/` folders. Original images were retained for compatibility; the nested folders are the source for new galleries.

## Place a gallery anywhere

```html
<div class="product-gallery"
     data-gallery="faeries/autumn-fae"
     data-count="0"></div>
```

`data-count="1"` shows the first photograph, `2` the first two, and `0` all photographs. Each generated image links to `faeries.html#autumn-fae`. Use a data attribute rather than an HTML `id` so the same gallery can appear several times without duplicate IDs. The product section itself has `id="autumn-fae"`.

Include `js/galleries.js` on any new page. Current pages already include it. JavaScript and HTTP hosting are needed to load gallery images; opening HTML directly with `file://` will not work. Product descriptions and order links are generated as normal HTML, so remain readable without JavaScript. Empty folders display “Photographs coming soon”; all-photo disclosures only appear when there are multiple photographs.

`data/images.json` is generated. Do not hand-edit it. A browser cannot list the contents of a folder on a static Netlify site, so the build does this once and browsers read the resulting index.

## Add, edit, hide or remove products

Edit `data/products.json`. Copy an entry, give it a unique ID and name, select an existing category, and edit its `blocks` (paragraphs or list items). For example:

```json
{
  "id": "moonlight-fae",
  "name": "Moonlight Fae",
  "category": "faeries",
  "page": "faeries.html",
  "orderTab": "faeries",
  "blocks": [{ "type": "p", "text": "Your description here." }],
  "active": true
}
```

Create `images/faeries/moonlight-fae/` and put its photos there. Rebuild. The section, navigation, photographs, and order link are created automatically. Set `active` to `false` to hide a product, or remove its entry. The order of entries controls display order. IDs must be unique across the catalogue; keep them stable to preserve customer links.

Supported categories: `faeries`, `wish-witches`, `kitchen-witches`, `fictional-magical-characters`, `more`. The fictional category uses `orderTab: "fictional-characters"`; all others use their category name. The More collection uses enquiry buttons because it is currently coming soon.

Do not edit content between `catalogue:…:start` and `catalogue:…:end` comments in HTML: the build replaces it. Editorial introduction and home-page copy remain in HTML. Adding a completely new category requires a page, order form and navigation update.

Prices and payment options still live in `order.html`. A price change must also be reflected in the corresponding Lopay payment link; changing a displayed price alone does not change what Lopay charges.

## Netlify deployment

`netlify.toml` sets `npm run build` and publishes the site root. No npm dependencies are needed. Node 22 or later is required. For manual drag-and-drop deployment, run the build locally first. Enable Netlify Forms detection in the site's settings and verify a test submission on a deployed preview before going live. The local preview cannot receive Netlify Forms submissions or verify payment processing.

## Recommended next step: an owner admin page without redeploying

For this small catalogue, use **JSON in Netlify Blobs, accessed through Netlify Functions, with a protected owner admin page**. JSON is the data format; Blobs is where the live data is stored. These are complementary choices. A relational database is unnecessary unless stock tracking, transactional orders, or complex reporting is added later.

Suggested implementation:

- Store a published catalogue JSON document and image objects in a site-wide Blobs store. Preserve these product IDs and image folder prefixes.
- Add a public read-only catalogue Function, and render product sections and navigation from its response at runtime. The current build-generated product HTML must be replaced or refreshed from the live catalogue to support publication without redeploying. Merely putting a JSON file into Blobs will not do that by itself.
- Build `/admin` with product forms, active/hidden toggles, image upload/reorder/remove, a preview, and an explicit Publish action. Store uploaded images with stable IDs and separate display order; serve them through an image Function.
- Use invite-only Netlify Identity, with an owner/admin role. Verify authentication AND role on every write/upload Function; hiding the admin link is not access control. Keep credentials server-side.
- Keep drafts separate from the published catalogue. Publish an entire validated catalogue snapshot, with a revision check so two browser tabs cannot overwrite each other's edits. Retain previous snapshots for rollback and export backups.
- Use strong consistency for immediate visibility after publishing, and configure HTTP caching so the browser does not keep a stale catalogue. Namespace preview and production stores separately: site-wide Blobs stores otherwise share data between deploy contexts.
- Move category pricing, quantity options, delivery cost, and Lopay link mappings into the same managed data model. Validate totals and require matching payment-link updates before publishing prices. Preserve static Netlify form declarations, because Netlify discovers forms at deploy time.

That requires one initial deployment to install the admin and Functions. Product/photo/price edits after that can publish without another deployment. Code changes still need deployment. The live admin/backend is a recommended next phase, not included in this change.

Alternative: Decap CMS provides a Git-backed editor and version history, but saving commits files and normally triggers a deployment. Choose it if “no manual deployment” is sufficient; choose Blobs if “no deployment at all for content edits” is essential.

Official references (checked September 2026):
- [Netlify Blobs: site-wide storage and consistency](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
- [Netlify Identity](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/overview/)
- [Identity remains supported: February 2026 update](https://www.netlify.com/blog/auth0-extension-identity-changes/)
- [Serving uploaded images from Blobs](https://developers.netlify.com/guides/user-generated-uploads-with-netlify-blobs/)

## Verification

`npm test` checks natural filename sorting, folder discovery, unsupported files, empty folders, catalogue validation, every product's order destination and gallery link, and repeatable builds. Live Netlify Forms and Lopay need deployment-level verification.
