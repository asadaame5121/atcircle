# Bluesky Webring

A modern Webring implementation integrated with Bluesky (ATProto) for
authentication, built on Cloudflare Workers.

## Overview

This project allows users to join a webring using their Bluesky account. It
provides a navigation widget for their sites and aggregates RSS feeds from
member sites.

## Tech Stack

- **Framework**: [Hono](https://hono.dev/)
- **Platform**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database**: Cloudflare D1
- **Styling**: [TailwindCSS](https://tailwindcss.com/) +
  [DaisyUI](https://daisyui.com/) (via CDN)
- **Auth**: [ATProto OAuth](https://atproto.com/specs/oauth)
  (@atproto/oauth-client-node)

## Features

- **Bluesky Login**: Secure authentication using your Bluesky handle.
- **Dashboard**:
  - Register and manage your site.
  - **Multi-site Detection**: Automatically scans your Bluesky profile for URLs
    to register.
  - **RSS Support**: Auto-detects RSS feeds for the antenna.
- **Webring Navigation**:
  - `/nav/next`, `/nav/prev`, `/nav/random` endpoints.
  - JavaScript widget for easy embedding.
- **Antenna**: A feed of recent posts from all webring members (Cron-based).
- **Responsive UI**: Modern, mobile-friendly design using DaisyUI.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js/npm)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
  CLI installed and authenticated.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd webring
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

### Local Development

1. Start the development server:
   ```bash
   npm run dev
   # or
   bun run dev
   ```
   This will start a local Wrangler session with a local D1 database.

2. Open `http://localhost:8787` in your browser.

### Database Setup (D1)

The project uses a D1 database named `webring-db`.

- **Local Schema**: applied automatically in dev.
- **Production Schema**: To apply schema changes to production:
  ```bash
  wrangler d1 execute webring-db --remote --file=./schema.sql
  ```
  _(Note: Ensure you have a `schema.sql` or create tables manually as needed)_

### Configuration

- **SECRET_KEY**: Used for JWT session signing.
  - In production, set this via `wrangler secret put SECRET_KEY`.
  - In `src/config.ts`, ensuring it matches the environment.

## Deployment

Deploy to Cloudflare Workers with a single command:

```bash
npm run deploy
```

## Embedding the Widget

Add the following code to your website to join the ring navigation:

```html
<script src="https://<your-worker-domain>/nav/widget.js"></script>
<webring-nav site="https://your-site.com"></webring-nav>
```

Replace `https://your-site.com` with your registered URL.

## License

MIT
