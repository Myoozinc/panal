export type EmbedInfo = { src: string; height: number; title: string } | null;

/** Returns an embeddable player URL for supported music/video links. */
export function getEmbed(url?: string | null): EmbedInfo {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "open.spotify.com") {
    const path = u.pathname.replace(/^\/(intl-[a-z]{2}\/)?/, "/");
    return { src: `https://open.spotify.com/embed${path}`, height: 152, title: "Reproductor de Spotify" };
  }
  if (host === "youtu.be") {
    return { src: `https://www.youtube-nocookie.com/embed${u.pathname}`, height: 220, title: "Reproductor de YouTube" };
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
    if (!id) return null;
    return { src: `https://www.youtube-nocookie.com/embed/${id}`, height: 220, title: "Reproductor de YouTube" };
  }
  if (host === "soundcloud.com") {
    return {
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.toString())}&color=%2321c25e&visual=false`,
      height: 166,
      title: "Reproductor de SoundCloud",
    };
  }
  return null;
}
