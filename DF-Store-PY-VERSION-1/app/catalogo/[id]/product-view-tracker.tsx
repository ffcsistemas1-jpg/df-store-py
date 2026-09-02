"use client";
import { useEffect } from "react";
import { trackProductView } from "../../../lib/analytics";

export default function ProductViewTracker({ id }: { id: string }) {
  useEffect(() => { trackProductView(id); }, [id]);
  return null;
}
