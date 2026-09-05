import type { Metadata } from "next";
import AdminShell from "./admin-shell";

export const metadata: Metadata = {
  title: "DF Store PY Admin",
  applicationName: "DF Store PY Admin",
  manifest: "/admin/manifest.webmanifest",
  robots: { index: false, follow: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
