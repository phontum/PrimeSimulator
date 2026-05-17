import { useState } from "react";

interface EmoteImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
}

export function EmoteImage({ src, alt, fallbackSrc, className = "" }: EmoteImageProps): JSX.Element {
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      className={`chat-image chat-line__message--emote mx-0.5 inline-block h-7 max-w-16 align-middle object-contain ${className}`}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
