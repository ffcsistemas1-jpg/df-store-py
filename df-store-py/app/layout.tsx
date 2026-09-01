import type { Metadata } from "next";
import "./globals.css";
import { Header } from "./ui";

export const metadata: Metadata = {
  title: "DF Store PY",
  description: "Todo lo que buscan en un solo lugar",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><Header/><main>{children}</main><footer><b>DF Store PY</b><span>Todo lo que buscan en un solo lugar</span></footer></body></html>;
}