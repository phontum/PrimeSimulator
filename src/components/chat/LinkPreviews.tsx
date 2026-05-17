import type { LinkPreview } from "../../services/chat/linkPreviews";

export function LinkPreviews({ previews }: { previews: LinkPreview[] }): JSX.Element | null {
  if (previews.length === 0) {
    return null;
  }

  return (
    <div className="tm-inline-link-preview">
      {previews.map((preview) => (
        <a key={preview.url} href={preview.url} target="_blank" rel="noreferrer" className="tm-preview-item">
          {preview.type === "image" ? (
            <img
              src={preview.src}
              alt="preview"
              loading="lazy"
              onError={(event) => {
                if (preview.fallbackSrc && event.currentTarget.src !== preview.fallbackSrc) {
                  event.currentTarget.src = preview.fallbackSrc;
                }
              }}
            />
          ) : (
            <video src={preview.src} muted loop autoPlay playsInline />
          )}
        </a>
      ))}
    </div>
  );
}
