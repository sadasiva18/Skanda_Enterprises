# Skanda Enterprises — Website

A single-page e-commerce site for wood cold-pressed oils, organic powders, and
farmer seed sourcing. Bilingual — Telugu (primary) and English.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure (header, shop, farmer corner, process, FAQs, reviews, footer) |
| `style.css` | All styling — responsive for desktop, tablet, and mobile |
| `script.js` | Renders products from `data.json`, cart, language toggle, animations |
| `data.json` | **All your content lives here** — edit this to change products/prices |
| `images/` | Product photos (`.jpg`, compressed). Originals backed up in `images/originals/` |

## How to add / remove / edit a product

Open `data.json`. Each product looks like this:

```json
{
  "te": "కొబ్బరి నూనె",
  "en": "Coconut Oil",
  "image": "images/coconut-oil.jpg",
  "rating": 4.9,
  "reviewsCount": 428,
  "badge": "Best Seller",
  "description": { "te": "...", "en": "..." },
  "sizes": [
    { "label": "500 ml", "price": 230, "originalPrice": 270 }
  ]
}
```

- `te` / `en` — Telugu and English names
- `image` — path to the photo in the `images/` folder
- `sizes` — each variant with `price` and `originalPrice` (shows a discount badge)
- To add a product: copy an existing block inside the category's `"items"` list and edit it
- Business name, WhatsApp number, and location are at the top of `data.json` under `"business"`

## Features

- Telugu / English language toggle (button in the header)
- Product search + category filters
- Shopping cart with free-delivery progress bar
- Checkout via WhatsApp (orders open as a pre-filled WhatsApp message)
- Farmer sourcing section listing seeds purchased with rates
- Always starts at the top of the page on reload

## Hosting on GitHub Pages

1. Create a new repository on GitHub (e.g. `skanda-enterprises`).
2. Upload these files (`index.html`, `style.css`, `script.js`, `data.json`,
   and the `images` folder) — drag them into the GitHub web UI or use `git push`.
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch",
   pick the `main` branch and `/ (root)` folder, then **Save**.
5. Your live URL (usually `https://<your-username>.github.io/<repo-name>/`)
   will be ready within a minute or two.

Any time you edit `data.json` and push the change, the live site updates
automatically — no rebuild step needed.

> **Tip:** Before uploading new product photos, compress them (e.g. tinypng.com)
> and keep them under ~300 KB for fast loading on mobile networks.
