# Tangent data access review notes

## Product purpose

Tangent gives an individual Reddit user a calmer desktop reading and posting experience. It is not a social network, data service, analytics product, bot, moderation service, or content mirror. It has no commercial use of Reddit data.

## Requested OAuth scopes

- `identity`: display the connected account name in the interface.
- `read`: display the authenticated user's Best feed.
- `vote`: let the user cast, change, or remove one vote after pressing the visible vote control.
- `save`: let the user save or unsave a visible post after pressing the visible save control.
- `submit`: let the user publish a text post after filling the form and pressing Post.

Tangent does not request `edit`, `privatemessages`, `history`, `mysubreddits`, or any moderation scope. Direct messages, chat, and editing are deliberately out of scope for this review.

## Data flow and retention

1. A user selects Connect Reddit and is sent to Reddit's consent page.
2. Reddit returns a temporary access token to the registered redirect URI.
3. Tangent verifies OAuth `state` and stores the token in browser session storage. It is cleared when the session expires, the browser session ends, or the user disconnects.
4. Tangent reads the Best feed and renders it in the current page. It does not copy the feed to a server, database, analytics tool, or third party.
5. A user-triggered vote, save, or submission is sent directly from the browser to Reddit's OAuth API.

No Reddit content, username, token, or account data leaves the user's browser except for direct requests to Reddit. Tangent does not use cookies or trackers for advertising, does not sell or license Reddit data, and does not use Reddit data for any AI/ML training or profiling.

## Security controls

- HTTPS is required for production deployment.
- OAuth state is high-entropy and verified on return.
- Tokens are not written to source control, logs, URLs, a backend, or durable browser storage.
- The app requests only the scopes listed above.
- The app never asks for a Reddit password.
- Users can disconnect from the profile control or revoke access through Reddit's account settings.

## Support and changes

Users can report an issue through the repository's GitHub Issues page. Any material change to requested scopes, data flows, retention, or supported features will be documented here and submitted for Reddit review before release.
