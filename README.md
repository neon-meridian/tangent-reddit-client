<p align="center">
  <img src="./public/readme-banner.svg" alt="Tangent for Reddit — a focused, user-operated desktop client" width="100%" />
</p>

<p align="center">
  <strong>A calmer, user-operated desktop client for Reddit.</strong><br />
  Read deliberately. Act explicitly. Keep your session private.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-E64F2C?style=flat-square&labelColor=2B2926" alt="Status: active" />
  <img src="https://img.shields.io/badge/oauth-temporary%20session-F6B76B?style=flat-square&labelColor=2B2926" alt="OAuth: temporary session" />
  <img src="https://img.shields.io/badge/data-no%20server%20retention-E64F2C?style=flat-square&labelColor=2B2926" alt="Data: no server retention" />
</p>

Tangent is an independent, user-operated desktop-style web client for Reddit. It provides a focused interface for reading a signed-in user's feed and, only when the user deliberately presses a control, voting, saving a post, or submitting a text post. Tangent is not affiliated with Reddit, Inc.

> [!NOTE]
> The visual interface works with preview data until Reddit OAuth is configured. Live actions run only after a user connects their own Reddit account and approves the requested permissions.

## Review summary

Tangent is intentionally narrow. It is **not** a replacement for every Reddit surface and does not implement direct messages, chat, moderation tooling, automated actions, bulk engagement, scraping, advertising, profiling, or AI training.

| User action | OAuth scope | Reddit API behavior | Storage |
| --- | --- | --- | --- |
| Connect account and show account name | `identity` | `GET /api/v1/me` | Account name only in page memory |
| Read the user's Best feed | `read` | `GET /best` | Page memory only |
| Vote or remove a vote | `vote` | `POST /api/vote` | Page memory only |
| Save or unsave a post | `save` | `POST /api/save`, `POST /api/unsave` | Page memory only |
| Submit a self post | `submit` | `POST /api/submit` | Page memory only |

Every write action is initiated by a click from the authenticated Reddit user. Tangent never acts on a schedule or in the background. An edit feature may be proposed only in a later review, after it has a visible, user-initiated interface.

## OAuth and data handling

Tangent is a browser-based public client. It uses Reddit's installed-app implicit OAuth flow with a randomly generated `state` value, a registered redirect URI, and a **temporary** access token. The token is kept in the browser's `sessionStorage` for the active browser session only; Tangent does not request a refresh token and does not run a backend that receives Reddit tokens or content.

The live API client is in `src/lib/reddit.ts`. It calls only `https://oauth.reddit.com` after the user grants consent. No Reddit passwords are requested or handled by Tangent. No Reddit data is sold, shared with third parties, used for advertising, used to train models, or retained in a Tangent database.

See [Privacy Policy](public/privacy.html), [Terms of Use](public/terms.html), [Support](public/support.html), and [Data Access Review Notes](DATA_ACCESS_REVIEW.md).

## Local development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Configure Reddit OAuth

1. Register Tangent as an **installed app** in Reddit's app preferences.
2. Choose a redirect URI served by the exact Tangent deployment, for example `http://localhost:5173/` during local development.
3. Copy `.env.example` to `.env.local`, then set the public client ID and the exact registered redirect URI.
4. Restart the Vite development server.

`VITE_REDDIT_CLIENT_ID` is public client configuration, not a secret. Never put a Reddit password, access token, refresh token, or confidential-app secret in a Vite environment variable or in this repository.

## Status

The visual interface remains usable with preview data until OAuth is configured. Live Reddit actions only run after a user connects their own account and approves the requested scopes.
