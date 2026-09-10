'use client';

import {
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  CircleUserRound,
  Compass,
  Flame,
  Home,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import {
  beginRedditAuthorization,
  clearRedditSession,
  consumeRedditAuthorization,
  getRedditBest,
  getRedditIdentity,
  isRedditConfigured,
  type RedditListingPost,
  type RedditSession,
  setRedditPostSaved,
  submitRedditTextPost,
  voteOnRedditPost,
} from '@/src/lib/reddit';

type View = 'Home' | 'Popular' | 'Explore' | 'Saved';
type Vote = -1 | 0 | 1;
type Post = {
  id: string;
  community: string;
  author: string;
  age: string;
  title: string;
  body?: string;
  score: number;
  comments: number;
  accent: 'blue' | 'violet' | 'orange';
  tag?: string;
  visual?: boolean;
  fullname?: string;
  saved: boolean;
  vote: Vote;
};

const navigation: { label: View; icon: typeof Home; badge?: string }[] = [
  { label: 'Home', icon: Home },
  { label: 'Popular', icon: Flame },
  { label: 'Explore', icon: Compass },
  { label: 'Saved', icon: Bookmark },
];

const communities = [
  { name: 'r/technology', color: '#56a8ff' },
  { name: 'r/AskReddit', color: '#ff6a52' },
  { name: 'r/photography', color: '#b68cff' },
  { name: 'r/cozyplaces', color: '#72c7a1' },
];

const activity = [
  ['r/space', 'Starship launch window opens in 2h', '12.4k watching'],
  ['r/gaming', 'Indie showcase discussion thread', '8.7k watching'],
  ['r/movies', 'September releases megathread', '5.1k watching'],
];

const initialPosts: Post[] = [
  {
    id: 'technology-small-changes',
    community: 'r/technology',
    author: 'u/future_archive',
    age: '4h',
    title: 'The tiny changes in technology that quietly improved everyday life',
    body: 'Forget the headline inventions. What small improvement made your daily routine noticeably better without getting much attention?',
    score: 18600,
    comments: 1800,
    accent: 'blue',
    tag: 'Discussion',
    saved: false,
    vote: 0,
  },
  {
    id: 'photography-morning-light',
    community: 'r/photography',
    author: 'u/morninggrain',
    age: '7h',
    title: 'Three years of chasing the same morning light',
    score: 6400,
    comments: 482,
    accent: 'violet',
    visual: true,
    saved: true,
    vote: 0,
  },
  {
    id: 'askreddit-small-rituals',
    community: 'r/AskReddit',
    author: 'u/cloudy_weekend',
    age: '9h',
    title: 'What small ritual makes your home feel like home?',
    body: 'Mine is opening the windows for ten minutes every morning, even when it is cold.',
    score: 9100,
    comments: 2300,
    accent: 'orange',
    tag: 'Conversation',
    saved: false,
    vote: 0,
  },
];

function formatCount(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 1)}k` : `${value}`;
}

function VoteRail({ post, onVote }: { post: Post; onVote: (vote: Vote) => void }) {
  return (
    <div className="vote-rail" aria-label={`${formatCount(post.score)} votes`}>
      <button
        aria-label={`Upvote ${post.title}`}
        aria-pressed={post.vote === 1}
        className="vote-button"
        onClick={() => onVote(1)}
      >▲</button>
      <span>{formatCount(post.score)}</span>
      <button
        aria-label={`Downvote ${post.title}`}
        aria-pressed={post.vote === -1}
        className="vote-button"
        onClick={() => onVote(-1)}
      >▼</button>
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>('Home');
  const [posts, setPosts] = useState(initialPosts);
  const [session, setSession] = useState<RedditSession | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'Best' | 'Rising'>('Best');
  const [composerOpen, setComposerOpen] = useState(false);
  const [community, setCommunity] = useState('r/technology');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const mapRedditPost = useCallback((post: RedditListingPost): Post => ({
    ...post,
    accent: 'orange',
    vote: post.likes === true ? 1 : post.likes === false ? -1 : 0,
  }), []);

  const refreshRedditFeed = useCallback(async (activeSession: RedditSession) => {
    setIsRefreshing(true);
    try {
      const livePosts = await getRedditBest(activeSession);
      setPosts(livePosts.map(mapRedditPost));
    } catch (error) {
      setConnectionNotice(error instanceof Error ? error.message : 'Could not load Reddit right now.');
    } finally {
      setIsRefreshing(false);
    }
  }, [mapRedditPost]);

  const voteOnPost = useCallback((postId: string, nextVote: Vote) => {
    setPosts((current) => current.map((post) => {
      if (post.id !== postId) return post;
      const resolvedVote = post.vote === nextVote ? 0 : nextVote;
      if (session && post.fullname) {
        void voteOnRedditPost(session, post.fullname, resolvedVote).catch((error: unknown) => {
          setConnectionNotice(error instanceof Error ? error.message : 'Could not update the Reddit vote.');
        });
      }
      return { ...post, score: post.score - post.vote + resolvedVote, vote: resolvedVote };
    }));
  }, [session]);

  const setPostSaved = useCallback((postId: string, saved?: boolean) => {
    setPosts((current) => current.map((post) => post.id === postId
      ? (() => {
        const nextSaved = saved ?? !post.saved;
        if (session && post.fullname) {
          void setRedditPostSaved(session, post.fullname, nextSaved).catch((error: unknown) => {
            setConnectionNotice(error instanceof Error ? error.message : 'Could not update the saved post.');
          });
        }
        return { ...post, saved: nextSaved };
      })()
      : post));
  }, [session]);

  const createPreviewPost = useCallback((postTitle: string, postBody: string, postCommunity: string) => {
    const cleanTitle = postTitle.trim();
    const cleanCommunity = postCommunity.trim();
    if (!cleanTitle || !cleanCommunity.startsWith('r/')) {
      throw new Error('A title and a community beginning with r/ are required.');
    }
    const id = `draft-${Date.now()}`;
    setPosts((current) => [{
      id,
      community: cleanCommunity,
      author: 'u/darianbuilds',
      age: 'now',
      title: cleanTitle,
      body: postBody.trim(),
      score: 1,
      comments: 0,
      accent: 'orange',
      tag: 'New post',
      saved: false,
      vote: 1,
    }, ...current]);
    setView('Home');
    return id;
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    try {
      const nextSession = consumeRedditAuthorization();
      queueMicrotask(() => setSession(nextSession));
      if (nextSession) {
        void Promise.resolve().then(async () => {
          const identity = await getRedditIdentity(nextSession);
          await refreshRedditFeed(nextSession);
          return identity;
        })
          .then((identity) => queueMicrotask(() => setUsername(identity.name)))
          .catch((error: unknown) => queueMicrotask(() => setConnectionNotice(error instanceof Error ? error.message : 'Could not complete Reddit sign-in.')));
      }
    } catch (error) {
      queueMicrotask(() => setConnectionNotice(error instanceof Error ? error.message : 'Could not complete Reddit authorization.'));
    }
  }, [refreshRedditFeed]);

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let next = view === 'Saved' ? posts.filter((post) => post.saved) : [...posts];
    if (normalizedQuery) {
      next = next.filter((post) => [post.title, post.body, post.community, post.author]
        .some((value) => value?.toLowerCase().includes(normalizedQuery)));
    }
    if (view === 'Popular') next.sort((a, b) => b.score - a.score);
    if (sort === 'Rising') next.sort((a, b) => a.age.localeCompare(b.age));
    return next;
  }, [posts, query, sort, view]);

  const submitPost = async () => {
    try {
      if (session) {
        await submitRedditTextPost(session, community, title.trim(), body.trim());
        await refreshRedditFeed(session);
      } else {
        createPreviewPost(title, body, community);
      }
      setTitle('');
      setBody('');
      setComposerOpen(false);
    } catch (error) {
      setConnectionNotice(error instanceof Error ? error.message : 'Could not submit the post.');
    }
  };

  const heading = view === 'Home' ? 'Good afternoon' : view;

  return (
    <SidebarProvider defaultOpen className="app-shell" style={{ '--sidebar-width': '16.75rem' } as CSSProperties}>
      <Sidebar collapsible="icon" className="border-white/8">
        <SidebarHeader className="px-3 pb-2 pt-4">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="brand-copy"><strong>Tangent</strong><small>for Reddit</small></span>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map(({ label, icon: Icon, badge }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      isActive={view === label}
                      tooltip={label}
                      className="sidebar-link"
                      onClick={() => setView(label)}
                    >
                      <Icon /><span>{label}</span>
                      {badge ? <span className="nav-badge">{badge}</span> : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="sidebar-label">Your communities</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {communities.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      tooltip={item.name}
                      className="sidebar-link"
                      onClick={() => { setQuery(item.name); setView('Home'); }}
                    >
                      <span className="community-dot" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/8 p-3">
          <button
            className="profile-chip"
            onClick={() => {
              if (session) {
                clearRedditSession();
                setSession(null);
                setUsername(null);
                setConnectionNotice('Disconnected from Reddit.');
              } else if (isRedditConfigured()) {
                beginRedditAuthorization();
              } else {
                setConnectionNotice('Add VITE_REDDIT_CLIENT_ID and VITE_REDDIT_REDIRECT_URI before connecting.');
              }
            }}
          >
            <span className="avatar">DI</span>
            <span className="profile-copy"><strong>{username ? `u/${username}` : 'Connect Reddit'}</strong><small>{session ? 'Session-only access' : 'OAuth sign-in required'}</small></span>
            <ChevronDown className="ml-auto size-4" />
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-transparent">
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="text-ink-muted hover:bg-ink/6 md:hidden" />
            <div className="search-wrap">
              <Search className="size-4" aria-hidden="true" />
              <Input
                ref={searchRef}
                aria-label="Search Reddit"
                placeholder="Search posts, communities, and people"
                className="search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
          </div>
          <div className="top-actions">
            <span className="demo-label"><span /> {session ? (isRefreshing ? 'Refreshing' : 'Connected to Reddit') : 'Preview data'}</span>
            <Button variant="ghost" size="icon" aria-label="Refresh Reddit feed" className="relative" disabled={!session || isRefreshing} onClick={() => session && void refreshRedditFeed(session)}>
              <Bell />
            </Button>
            <Button className="create-button" onClick={() => setComposerOpen(true)}>
              <PenLine data-icon="inline-start" />Create
            </Button>
          </div>
        </header>

        <main className="workspace">
          <section className="feed" aria-labelledby="feed-title">
              {connectionNotice ? <output className="connection-notice"><span>{connectionNotice}</span><button onClick={() => setConnectionNotice(null)} aria-label="Dismiss notice">×</button></output> : null}
              <div className="feed-heading">
                <div><p className="eyebrow">{view === 'Saved' ? 'Your library' : 'Your front page'}</p><h1 id="feed-title">{heading}</h1></div>
                <div className="feed-sort" aria-label="Sort posts">
                  <button className={sort === 'Best' ? 'active' : ''} onClick={() => setSort('Best')}><Sparkles /> Best</button>
                  <button className={sort === 'Rising' ? 'active' : ''} onClick={() => setSort('Rising')}><TrendingUp /> Rising</button>
                </div>
              </div>

              {visiblePosts.length ? visiblePosts.map((post) => (
                <article className="post-card" key={post.id}>
                  <VoteRail post={post} onVote={(nextVote) => voteOnPost(post.id, nextVote)} />
                  <div className="post-body">
                    <div className="post-meta">
                      <span className={`community-avatar ${post.accent}`}>{post.community.charAt(2).toUpperCase()}</span>
                      <strong>{post.community}</strong><span>•</span><span>posted by {post.author}</span><span>{post.age}</span>
                      <button aria-label="More actions"><MoreHorizontal /></button>
                    </div>
                    <h2>{post.title}</h2>
                    {post.body ? <p className="post-copy">{post.body}</p> : null}
                    {post.visual ? (
                      <div className="photo-study" aria-hidden="true">
                        <div className="sun-disc" /><div className="photo-caption"><span>APR 2023 — SEP 2026</span><strong>Study No. 17</strong></div>
                      </div>
                    ) : null}
                    {post.tag ? <div className="topic-chips"><span>{post.tag}</span><span>{post.community.slice(2)}</span></div> : null}
                    <div className="post-actions">
                      <button><MessageCircle /> {formatCount(post.comments)} comments</button>
                      <button className={post.saved ? 'saved' : ''} onClick={() => setPostSaved(post.id)} aria-pressed={post.saved}>
                        {post.saved ? <Check /> : <Bookmark />} {post.saved ? 'Saved' : 'Save'}
                      </button>
                      <button><MoreHorizontal /> More</button>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="empty-feed"><Bookmark /><h2>No posts here yet</h2><p>{query ? 'Try a different search.' : 'Save a post and it will appear here.'}</p></div>
              )}
          </section>

          <aside className="context-rail" aria-label="Current Reddit activity">
            <section className="rail-card">
              <div className="rail-title"><div><p className="eyebrow">Happening now</p><h2>Live threads</h2></div><span className="live-pulse" /></div>
              <div className="activity-list">
                {activity.map(([itemCommunity, itemTitle, viewers]) => (
                  <button key={itemCommunity} className="activity-item">
                    <span className="activity-icon"><Users /></span>
                    <span><small>{itemCommunity}</small><strong>{itemTitle}</strong><em>{viewers}</em></span>
                  </button>
                ))}
              </div>
            </section>
            <section className="rail-card compact-card">
              <CircleUserRound className="size-5" /><div><h2>Your week</h2><p>12 saved posts · 8 conversations</p></div><button>View</button>
            </section>
            <p className="legal-line">Tangent is an independent client for Reddit. <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="/support.html">Support</a></p>
          </aside>
        </main>
      </SidebarInset>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="composer-dialog sm:max-w-xl">
          <DialogHeader>
            <p className="eyebrow">Create</p>
            <DialogTitle>New post</DialogTitle>
            <DialogDescription>{session ? 'This action will be submitted to Reddit only after you press Post.' : 'Preview mode: connect Reddit before publishing live content.'}</DialogDescription>
          </DialogHeader>
          <div className="composer-fields">
            <div className="composer-field">
              <label htmlFor="post-community">Community</label>
              <Input id="post-community" value={community} onChange={(event) => setCommunity(event.target.value)} placeholder="r/community" required />
            </div>
            <div className="composer-field">
              <label htmlFor="post-title">Title</label>
              <Input id="post-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="An interesting title" maxLength={300} required />
            </div>
            <div className="composer-field">
              <label htmlFor="post-body">Body <span>optional</span></label>
              <Textarea id="post-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add context, details, or a question…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>Cancel</Button>
            <Button onClick={submitPost} disabled={!title.trim() || !community.startsWith('r/')}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
