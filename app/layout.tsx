import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import CopilotProvider from "@/components/CopilotProvider";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Popper",
  description: "Adversarial PR verification gate. Break the claim, don't read the diff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <CopilotProvider>{children}</CopilotProvider>
      </body>
    </html>
  );
}
