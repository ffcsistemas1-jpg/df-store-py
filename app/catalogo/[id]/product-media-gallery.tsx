"use client";
import { useMemo, useState } from "react";

type Media = {
  id?: string;
  media_type: "image" | "video";
  url: string;
  mime_type?: string | null;
  original_name?: string | null;
  sort_order?: number;
  is_primary?: boolean;
};

export default function ProductMediaGallery({
  name,
  media,
}: {
  name: string;
  media: Media[];
}) {
  const items = useMemo(
    () =>
      [...media].sort(
        (a, b) =>
          Number(b.is_primary) - Number(a.is_primary) +
          (a.sort_order || 0) - (b.sort_order || 0),
      ),
    [media],
  );
  const [active, setActive] = useState(0);
  const current = items[active] || null;

  if (!current) {
    return (
      <div style={{ width: "100%", aspectRatio: "1 / 1", display: "grid", placeItems: "center", background: "#f5efeb", borderRadius: 18 }}>
        <b style={{ fontFamily: "Georgia", fontSize: 70, color: "#98234d" }}>DF</b>
      </div>
    );
  }

  return (
    <div
      data-product-gallery="true"
      style={{
        display: "block",
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          maxWidth: "100%",
          height: "auto",
          aspectRatio: "1 / 1",
          overflow: "hidden",
          isolation: "isolate",
          backgroundColor: "#f5efeb",
          border: "1px solid #eadfe0",
          borderRadius: 18,
          boxSizing: "border-box",
        }}
      >
        {current.media_type === "image" ? (
          <img
            key={current.url}
            src={current.url}
            alt={`${name} - imagen ${active + 1}`}
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              width: "100%",
              height: "100%",
              minWidth: 0,
              minHeight: 0,
              maxWidth: "none",
              maxHeight: "none",
              objectFit: "contain",
              objectPosition: "center center",
              margin: 0,
              padding: 0,
              border: 0,
              transform: "none",
            }}
          />
        ) : (
          <video
            key={current.url}
            src={current.url}
            controls
            playsInline
            preload="metadata"
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              width: "100%",
              height: "100%",
              minWidth: 0,
              minHeight: 0,
              maxWidth: "none",
              maxHeight: "none",
              objectFit: "contain",
              margin: 0,
              padding: 0,
              border: 0,
            }}
          />
        )}
      </div>

      {items.length > 1 && (
        <div
          data-product-gallery-thumbs="true"
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "center",
            gap: 10,
            width: "100%",
            maxWidth: "100%",
            overflowX: "auto",
            overflowY: "hidden",
            padding: "12px 2px 4px",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 3,
          }}
        >
          {items.map((item, index) => (
            <button
              key={item.id || `${item.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver ${item.media_type === "image" ? "imagen" : "video"} ${index + 1}`}
              style={{
                flex: "0 0 64px",
                width: 64,
                minWidth: 64,
                height: 64,
                minHeight: 64,
                display: "block",
                padding: 0,
                margin: 0,
                overflow: "hidden",
                borderRadius: 10,
                border: `2px solid ${index === active ? "#98234d" : "#eadfe0"}`,
                background: "#fff",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              {item.media_type === "image" ? (
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", margin: 0, padding: 0, border: 0 }}
                />
              ) : (
                <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3, color: "#98234d", fontWeight: 800, fontSize: 18 }}>
                  <span>▶</span>
                  <small style={{ fontSize: 9, lineHeight: 1 }}>Video {index + 1}</small>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
