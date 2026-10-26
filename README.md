# SeoSonas catalogue

The site now includes a live Owner’s Studio at `/admin/`, powered by Netlify Identity, Functions and Blobs. See **[ADMIN_SETUP.md](ADMIN_SETUP.md)** for activation and daily editing. The existing Netlify Forms + Lopay flow remains, with no basket.

The files in `data/` seed the initial catalogue. Once the studio saves content, Blobs becomes the source of truth; repository edits do not overwrite live content. The folder workflow below is useful for initial setup and static previews.

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

Include `js/galleries.js` on any new page. Current pages already include it. The build now renders photographs, navigation, descriptions and order links as normal HTML, so they are readable without JavaScript. Preview over HTTP to test interactive features. JavaScript can still populate new unbuilt gallery elements from the image index. Empty folders display “Photographs coming soon”; JavaScript hides all-photo disclosures when there are fewer than two photographs.

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

Initial prices and payment options live in `data/pricing.json`; after activation they are managed in the studio. A price change must also be reflected in the corresponding Lopay payment link; changing a displayed price alone does not change what Lopay charges.

## Netlify deployment

`netlify.toml` sets `npm run build`, publishes `dist`, and packages `netlify/functions`. Node 22.12 or later and the locked npm dependencies are required. The backend serves the live catalogue as crawlable HTML; static HTML remains in the deployment for Netlify Forms detection. Use a normal Netlify build/deploy with Functions, not a static-only drag-and-drop upload. See [ADMIN_SETUP.md](ADMIN_SETUP.md) for invite-only Identity setup and the deployment smoke test.

## Live editing

Use the studio to add/edit/hide/remove products, upload/reorder photos, change collection photos and prices, preview private drafts, publish, export/import backups and restore previous published versions. Publication uses atomic version checks and does not require a deployment. Existing categories and order forms are retained. Administrative access requires an invited Identity account with the `admin` role; a sign-in alone is not sufficient.

## Verification

`npm test` covers folder discovery, catalogue validation, generated SEO, draft isolation, admin authorization, CSRF, version conflicts, publication/rollback, price validation, stale checkout rejection, upload signatures and private media. `npm run demo:admin` runs a disposable local studio with no access to live data. Hosted Identity, Blobs, Netlify Forms and Lopay need deployment-level verification.


## Search visibility

`data/site.json` holds the confirmed production domain, https://seosonas.co.uk, and the Etsy/Facebook profiles. The build adds unique titles/descriptions, canonical links, social sharing previews, Organization/WebSite/CollectionPage and breadcrumb structured data, static navigation and gallery photos, and a page-and-image sitemap. Metadata wording is maintained in `scripts/seo.mjs`.

The home page uses `/` as canonical; collections retain their existing `.html` URLs (the live faeries URL returned HTTP 200 during checks). Product section anchors are not separate indexable pages and are not separate sitemap entries. No unverified ratings, stock availability, shipping promises or product offer prices have been added to structured data. Individual product rich results would require a later product-detail-page design and verified offer data.

The order form uses `noindex, follow` to keep form/query-string variants out of search; shoppers reach it from indexed collections. Netlify deploy previews and branch deploys also receive `noindex`; production pages remain indexable. Supporting JSON/snippet files carry noindex response headers. `robots.txt` allows crawling so crawlers can see those directives. Netlify serves `404.html` for missing pages with a 404 response.

After deploying:

1. Verify the domain in Google Search Console (owner account/DNS access required) and submit https://seosonas.co.uk/sitemap.xml. This has not been done by the code changes.
2. Inspect the home page and each collection in Search Console. Confirm production is publicly accessible, uses the preferred domain, and has no unexpected noindex response headers. Test the structured data in Google's Rich Results Test.
3. Add a link back to https://seosonas.co.uk/ from the Etsy shop profile and Facebook website field where supported. This work adds links *on this website*; it does not edit those external accounts.
4. Add clear photos and factual details for each creation: dimensions, materials, how it is made, care, lead times, and what customers receive. Much of the catalogue still lacks product-specific photos/details; accurate, useful content is the next priority. Larger source photos would also benefit from a future automated responsive-image build pipeline.
5. Review Search Console impressions, queries and indexing after recrawling. Rankings and rich results are not guaranteed by metadata or outbound social links.

Sources: [Google image guidance](https://developers.google.com/search/docs/appearance/google-images), [Organization markup and profile links](https://developers.google.com/search/docs/appearance/structured-data/organization), [ecommerce URL guidance](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites).
