"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";

export default function CopilotProvider({ children }: { children: React.ReactNode }) {
  return <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>;
}
