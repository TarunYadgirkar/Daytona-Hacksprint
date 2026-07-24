import type { Metadata } from "next";
import CopilotProvider from "@/components/CopilotProvider";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeShip",
  description: "Adversarial PR verification gate. Break the claim, don't read the diff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotProvider>{children}</CopilotProvider>
      </body>
    </html>
  );
}
