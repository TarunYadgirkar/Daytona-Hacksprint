import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import CopilotProvider from "@/components/CopilotProvider";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  variable: "--font-display",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Popper",
  description: "Adversarial PR verification gate. Break the claim, don't read the diff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <CopilotProvider>{children}</CopilotProvider>
      </body>
    </html>
  );
}
