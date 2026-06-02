import { useEffect, useState } from 'react';

/** Extrait le nom de chaîne d'une URL Twitch (ou accepte un nom brut). */
function parseTwitchChannel(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // nom de chaîne brut (pas d'URL)
  if (!raw.includes('/') && !raw.includes('.')) return raw;
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (!u.hostname.toLowerCase().includes('twitch.tv')) return null;
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    const reserved = new Set(['videos', 'directory', 'p', 'settings', 'subscriptions', 'downloads']);
    const channel = segments[0];
    if (reserved.has(channel.toLowerCase())) return null;
    return channel;
  } catch {
    return null;
  }
}

/** Extrait l'ID vidéo d'une URL YouTube (watch, youtu.be, /live/, /embed/). */
function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.split('/').filter(Boolean)[0] ?? null;
    }
    const v = u.searchParams.get('v');
    if (v) return v;
    const segments = u.pathname.split('/').filter(Boolean);
    const idx = segments.findIndex((s) => s === 'live' || s === 'embed' || s === 'shorts');
    if (idx >= 0 && segments[idx + 1]) return segments[idx + 1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Player embarqué pour la page d'un match. Twitch en priorité (plateforme du
 * tournoi), fallback YouTube. Le `parent` Twitch DOIT correspondre au hostname
 * de la page — on le calcule côté client après montage (pas dispo en SSR).
 */
export function StreamEmbed({
  twitchUrl,
  youtubeUrl,
  live = false,
}: {
  twitchUrl?: string | null;
  youtubeUrl?: string | null;
  live?: boolean;
}) {
  const [parent, setParent] = useState<string | null>(null);

  useEffect(() => {
    setParent(window.location.hostname);
  }, []);

  const channel = twitchUrl ? parseTwitchChannel(twitchUrl) : null;
  const ytId = !channel && youtubeUrl ? parseYouTubeId(youtubeUrl) : null;

  if (!channel && !ytId) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-purple-500/25 bg-black">
      {channel ? (
        parent ? (
          <iframe
            title="Diffusion Twitch"
            src={`https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&autoplay=false`}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-[0.22em] text-white/30">
            Chargement du player…
          </div>
        )
      ) : (
        <iframe
          title="Diffusion YouTube"
          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
          className="absolute inset-0 h-full w-full"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        />
      )}

      {live && (
        <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          Live
        </span>
      )}
    </div>
  );
}
