export interface LinkPreview {
  type: "image" | "video";
  url: string;
  src: string;
  fallbackSrc?: string;
}

const urlPattern = /https?:\/\/[^\s<>"']+/gi;

export function findLinkPreviews(text: string): LinkPreview[] {
  const previews: LinkPreview[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(text)) !== null) {
    const url = match[0].replace(/[),.]+$/g, "");
    if (seen.has(url)) {
      continue;
    }

    const preview = classifyUrl(url);
    if (preview) {
      previews.push(preview);
      seen.add(url);
    }

    if (previews.length >= 2) {
      break;
    }
  }

  return previews;
}

function classifyUrl(url: string): LinkPreview | null {
  const sevenTv = parseSevenTvUrl(url);
  if (sevenTv) {
    return sevenTv;
  }

  if (/\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(url)) {
    return { type: "image", url, src: url };
  }

  if (/\.(mp4|webm)(\?.*)?$/i.test(url)) {
    return { type: "video", url, src: url };
  }

  return null;
}

function parseSevenTvUrl(url: string): LinkPreview | null {
  try {
    const parsed = new URL(url);
    const cdnMatch = parsed.href.match(/cdn\.7tv\.app\/emote\/([A-Za-z0-9_-]+)\/([1-4]x)\.(webp|gif|avif|png)/i);
    if (cdnMatch) {
      return { type: "image", url, src: parsed.href };
    }

    const pageMatch = parsed.pathname.match(/^\/emotes\/([A-Za-z0-9_-]+)/i);
    if (parsed.hostname.includes("7tv.app") && pageMatch) {
      const id = pageMatch[1];
      return {
        type: "image",
        url,
        src: `https://cdn.7tv.app/emote/${id}/4x.webp`,
        fallbackSrc: `https://cdn.7tv.app/emote/${id}/4x.avif`,
      };
    }
  } catch {
    return null;
  }

  return null;
}
