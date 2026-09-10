export const REDDIT_SCOPES = ['identity', 'read', 'submit', 'vote', 'save'] as const;

export type RedditSession = {
  accessToken: string;
  expiresAt: number;
  scope: string;
  username?: string;
};

export type RedditListingPost = {
  id: string;
  fullname: string;
  community: string;
  author: string;
  age: string;
  title: string;
  body?: string;
  score: number;
  comments: number;
  saved: boolean;
  likes: boolean | null;
  permalink: string;
};

const SESSION_KEY = 'tangent.reddit.session.v1';
const STATE_KEY = 'tangent.reddit.oauth-state.v1';
const API_ROOT = 'https://oauth.reddit.com';

function config() {
  return {
    clientId: import.meta.env.VITE_REDDIT_CLIENT_ID?.trim(),
    redirectUri: import.meta.env.VITE_REDDIT_REDIRECT_URI?.trim(),
  };
}

function makeState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isRedditConfigured() {
  const { clientId, redirectUri } = config();
  return Boolean(clientId && redirectUri);
}

export function beginRedditAuthorization() {
  const { clientId, redirectUri } = config();
  if (!clientId || !redirectUri) throw new Error('Reddit OAuth has not been configured for this deployment.');

  const state = makeState();
  sessionStorage.setItem(STATE_KEY, state);
  const url = new URL('https://www.reddit.com/api/v1/authorize');
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    state,
    redirect_uri: redirectUri,
    duration: 'temporary',
    scope: REDDIT_SCOPES.join(' '),
  }).toString();
  window.location.assign(url.toString());
}

export function consumeRedditAuthorization(): RedditSession | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get('access_token');
  if (!accessToken) return loadRedditSession();

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const returnedState = hash.get('state');
  const error = hash.get('error');
  sessionStorage.removeItem(STATE_KEY);
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  if (error) throw new Error(`Reddit authorization was not completed: ${error}.`);
  if (!expectedState || expectedState !== returnedState) throw new Error('Reddit authorization could not be verified. Please try again.');

  const expiresIn = Number(hash.get('expires_in') ?? '0');
  const session = {
    accessToken,
    expiresAt: Date.now() + Math.max(expiresIn, 0) * 1000,
    scope: hash.get('scope') ?? '',
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function loadRedditSession(): RedditSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as RedditSession;
    if (!session.accessToken || session.expiresAt <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearRedditSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

async function api<T>(session: RedditSession, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.accessToken}`);
  headers.set('Accept', 'application/json');
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) throw new Error(`Reddit returned ${response.status}. Please reconnect and try again.`);
  return response.json() as Promise<T>;
}

export async function getRedditIdentity(session: RedditSession) {
  return api<{ name: string }>(session, '/api/v1/me');
}

export async function getRedditBest(session: RedditSession) {
  const listing = await api<{ data?: { children?: Array<{ data: Record<string, unknown> }> } }>(session, '/best?raw_json=1&limit=25');
  return (listing.data?.children ?? []).map(({ data }) => ({
    id: String(data.id),
    fullname: String(data.name),
    community: `r/${String(data.subreddit)}`,
    author: `u/${String(data.author)}`,
    age: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((Number(data.created_utc) * 1000 - Date.now()) / 3_600_000), 'hour'),
    title: String(data.title),
    body: typeof data.selftext === 'string' ? data.selftext : undefined,
    score: Number(data.score ?? 0),
    comments: Number(data.num_comments ?? 0),
    saved: Boolean(data.saved),
    likes: data.likes === true ? true : data.likes === false ? false : null,
    permalink: typeof data.permalink === 'string' ? data.permalink : '',
  })) satisfies RedditListingPost[];
}

function form(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}

async function write(session: RedditSession, path: string, values: Record<string, string>) {
  await api<unknown>(session, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form({ api_type: 'json', ...values }),
  });
}

export function voteOnRedditPost(session: RedditSession, fullname: string, direction: -1 | 0 | 1) {
  return write(session, '/api/vote', { id: fullname, dir: String(direction) });
}

export function setRedditPostSaved(session: RedditSession, fullname: string, saved: boolean) {
  return write(session, saved ? '/api/save' : '/api/unsave', { id: fullname });
}

export function submitRedditTextPost(session: RedditSession, subreddit: string, title: string, text: string) {
  return write(session, '/api/submit', { sr: subreddit.replace(/^r\//i, ''), kind: 'self', title, text });
}
