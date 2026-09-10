"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { captureAttribution, newEventId, pixelTrack, sendCapiEvent } from "../lib/meta-pixel";

declare global {
  interface Window { fbq?: (...args: any[]) => void; }
}

export default function MetaPixelRuntime() {
  const pathname = usePathname();
  const [pixelId, setPixelId] = useState("");

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    let alive = true;
    fetch("/api/meta-public-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (alive) setPixelId(String(data?.pixelId || "")); })
      .catch(() => {});
    return () => { alive = false; };
  }, [pathname]);

  useEffect(() => {
    if (!pathname?.startsWith("/admin")) captureAttribution();
  }, [pathname]);

  useEffect(() => {
    if (!pixelId || pathname?.startsWith("/admin")) return;
    const eventId = newEventId();
    let sent = false;
    let attempts = 0;
    const send = () => {
      if (sent) return;
      if (typeof window !== "undefined" && window.fbq) {
        sent = true;
        pixelTrack("PageView", {}, eventId);
        sendCapiEvent({ event_name: "PageView", event_id: eventId });
        return;
      }
      attempts += 1;
      if (attempts >= 20) {
        sent = true;
        sendCapiEvent({ event_name: "PageView", event_id: eventId });
      }
    };
    send();
    const timer = window.setInterval(() => { send(); if (sent) window.clearInterval(timer); }, 150);
    return () => window.clearInterval(timer);
  }, [pixelId, pathname]);

  if (!pixelId || pathname?.startsWith("/admin")) return null;

  return <>
    <Script id={`meta-pixel-base-${pixelId}`} strategy="afterInteractive">{`
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
    `}</Script>
    <noscript>
      <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`} />
    </noscript>
  </>;
}
