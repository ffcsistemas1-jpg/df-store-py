"use client";
import { useEffect } from "react";
import { trackProductView } from "../../../lib/analytics";
import { pixelTrack, sendCapiEvent, newEventId } from "../../../lib/meta-pixel";

export default function ProductViewTracker({ id, name, price }: { id: string; name?: string; price?: number }) {
  useEffect(() => {
    trackProductView(id);
    const evId = newEventId();
    const params = { content_ids: [id], content_type: "product", content_name: name, value: Number(price) || 0, currency: "PYG" };
    pixelTrack("ViewContent", params, evId);
    sendCapiEvent({ event_name: "ViewContent", event_id: evId, value: params.value, currency: "PYG", content_ids: [id] });
  }, [id]);
  return null;
}
