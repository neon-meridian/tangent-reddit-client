# Tangent for Reddit

Tangent is an independent, user-operated web client for Reddit. It explores a
focused desktop interface for browsing feeds, voting, saving posts, composing
content, and reading supported messages.

The current version is an interactive product prototype powered by local preview
data. Live Reddit access will be added after the application is approved for the
Reddit Data API.

## Current features

- Responsive desktop-style feed and community navigation
- Search and feed sorting
- Interactive upvotes, downvotes, and saved posts
- Post composer with immediate feed updates
- Private-message interface prototype
- Keyboard shortcut support
- Progressive WebMCP actions for posting, voting, and saving

## Development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Reddit integration

The live integration will use user-authorized Reddit OAuth and only documented,
approved Data API endpoints. All write actions will remain explicitly initiated
by the signed-in user. The project will not scrape Reddit, automate voting, or
use undocumented chat systems.

Never commit OAuth client secrets, access tokens, refresh tokens, or local
environment files.

## Status

This project is under active development and is not affiliated with or endorsed
by Reddit, Inc. Reddit and the Reddit logo are trademarks of Reddit, Inc.
