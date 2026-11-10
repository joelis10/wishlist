# Wishlist

A small, self-hosted wishlist app. One container, one SQLite database, no external services.

## What's included

- Accounts with persistent sessions, public wishlists, owner-managed editors, and private wishlists that only the owner and editors can open.
- Wishlist images, descriptions, optional recurring end dates, item search, price/site filters and sorting.
- Items added from a product link. An on-demand scraper suggests title, description, price and image; every suggestion can be selected or ignored before the item is saved.
- Guest claims with a name, plus a spoiler prompt before a wishlist opens.
- Installable PWA with Android share-sheet support. No native Android app is needed.
- Web Push registration and a test notification.
- A daily background job that refreshes prices and stock availability.
- Link previews with the wishlist photo, title and item count.

## Quick start

```bash
cp .env.example .env
# Set APP_URL to the address you will visit, e.g. https://wishlist.example.com
docker compose up -d --build
```

Open the app and create the first account. Then create a wishlist. It stays private until you open **Settings → Visibility → Make public**.

The SQLite database and uploaded images live in the `wishlist-data` Docker volume. Uploaded images are served from `/uploads`; no external storage is needed. If you replace the named volume with a bind mount, make sure the container user (UID 1000) can write to it.

### Behind a reverse proxy

Point your proxy at `127.0.0.1:3000` (or the port in `APP_PORT`), terminate HTTPS there, and set `APP_URL=https://your-domain`. Cookies are marked `Secure` automatically when `APP_URL` starts with `https://`. HTTPS is required for installing the PWA and for notifications.

If you expose the container directly, set `APP_PORT` and use `http://server-ip:3000`.

## Using it

- **Public wishlists** appear on the browse page and can be opened by anyone. **Private wishlists** can only be opened by the owner and people they add.
- A guest link is only available once a wishlist is public. Editors can add and edit items, but only the owner can change visibility, collaborators or delete the wishlist.
- On the first visit to a wishlist, guests are asked whether it belongs to them. Owners get a spoiler-free view; buyers see claims.
- Claiming an item requires a name so other guests know it has been bought. Claims are atomic: two people cannot claim the same item.
- Item descriptions are replaced on the card by a custom note when one exists. **View item** opens the full note, description and a link to the original page.

## Configuration

Copy `.env.example` to `.env`. Compose reads it automatically.

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_URL` | `http://localhost:3000` | Public URL used in share links and link previews. |
| `APP_PORT` | `3000` | Host port published by Compose. |
| `COOKIE_SECURE` | derived from `APP_URL` | Force `Secure` cookies on or off. |
| `ALLOW_REGISTRATION` | `true` | Set to `false` after creating your accounts to close sign-ups. |
| `TZ` | system | Timezone used for the end dates and the scrape schedule. |
| `DEFAULT_CURRENCY` | `GBP` | Currency used when no currency is found. |
| `SCRAPE_ENABLED` | `true` | Enable the scheduled price/stock refresh. |
| `SCRAPE_CRON` | `0 0 * * *` | Five-field cron expression, checked in `TZ`. |
| `SCRAPE_HEADLESS` | `auto` | On-demand scraper: `auto`, `always` or `never` use Chromium. |
| `SCRAPE_JOBS_HEADLESS` | `false` | Allow scheduled refreshes to use Chromium. Heavier. |
| `SCRAPE_MAX_PER_RUN` | `1000` | Maximum items checked per run; `0` means no limit. |
| `SCRAPE_DELAY_MS` | `2500` | Delay between requests. |
| `SCRAPE_DOMAIN_DELAY_MS` | `15000` | Minimum delay between requests to the same domain. |
| `CHROMIUM_PATH` | set by the image | Optional path to a Chromium binary for scraper fallback. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | auto-generated | Web Push keys. Generated once and stored in the database if omitted. |
| `VAPID_SUBJECT` | `APP_URL` | Contact string for push services. Use a `mailto:` address if possible. |

## Scraper

Pasting a link never scrapes automatically. Press **Fetch details** to try. The scraper first uses a normal HTTP request with a browser user agent and reads JSON-LD, Open Graph, microdata and visible price fields. In `auto` mode it falls back to headless Chromium when the page is blocked or has no usable product data.

Some shops block data-centre IPs or require a login; in those cases the app shows an error and keeps **Manually input details** available. The container includes Chromium but it is only launched on demand. Keep `SCRAPE_JOBS_HEADLESS=false` unless scheduled checks really need a browser.

The scraper accepts only standard HTTP/HTTPS URLs on public addresses, limits response size and redirects, and rate-limits requests.

## Price and stock refresh

The scheduler is built into the app and starts at midnight by default. It checks every unclaimed item with a link, one at a time with per-domain delays, and updates the stored price and availability when the page exposes them. Claimed items are skipped because they have already been bought.

On a large list the first run may take a while; use `SCRAPE_MAX_PER_RUN` to cap it. This setup is intended for a single app instance. Do not run multiple replicas, otherwise each one will schedule its own refresh.

## PWA and notifications

On Android, open the site in Chrome and choose **Install app** or **Add to Home screen**. Once installed, sharing a link from another app shows **Wishlist** in the share sheet. The link opens the add-item flow for your default wishlist, or a wishlist picker if none is set. The default wishlist is configured in **Settings**.

iOS can install the PWA, but iOS does not support web share targets, so the share-sheet shortcut is Android-only. No native app is required or included.

Enable notifications per device in **Settings → Notifications**. The switch registers the service worker and stores a push subscription. A test notification is available. Actual notification events are intentionally not wired up yet; the delivery infrastructure is ready for whatever you want to send later.

## Backups

Everything is in `/data` inside the container: `wishlist.db`, `wishlist.db-wal`, `wishlist.db-shm` and the `uploads/` folder.

```bash
docker compose stop app
docker run --rm \
  -v wishlist_wishlist-data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/wishlist-backup.tgz -C /data .
docker compose start app
```

Restore with the same command in reverse while the app is stopped.

## Building with GitHub Actions

`.github/workflows/docker.yml` builds multi-architecture (`linux/amd64` and `linux/arm64`) images and pushes them to `ghcr.io/<owner>/<repo>` on pushes to `main` and version tags.

This is free for public repositories. On a private repository it uses your included GitHub Actions minutes and GHCR storage; delete the workflow if you would rather build with Compose on your server.

To deploy an image from GHCR instead of building on the server:

```bash
WISHLIST_IMAGE=ghcr.io/<owner>/<repo>:latest docker compose pull
WISHLIST_IMAGE=ghcr.io/<owner>/<repo>:latest docker compose up -d --no-build
```

Make the GHCR package public in GitHub (or log the server into `ghcr.io`). To update later, pull and recreate the container.

## Local development

Node 24 is required because the app uses the built-in `node:sqlite` module.

```bash
npm install
DATA_DIR=./data APP_URL=http://localhost:3000 npm run dev
npm test
npm run build
```

Icons and the default share image are generated into `public/` by `npm run assets`. They are committed, so this is only needed if you change the artwork.

## Limits

- 1,000 items per wishlist.
- Images are resized to 1600 × 1000 JPEG; uploads are limited to 8 MB.
- One app container. SQLite and the in-process scheduler are chosen for a small self-hosted deployment, not for horizontal scaling.
