"use client";

import {
  CopilotChatConfigurationProvider,
  CopilotKit,
} from "@copilotkit/react-core/v2";

export default function CopilotProvider({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      publicLicenseKey={process.env.NEXT_PUBLIC_COPILOTKIT_PUBLIC_LICENSE_KEY}
      useSingleEndpoint={false}
    >
      <CopilotChatConfigurationProvider isModalDefaultOpen={false}>
        {children}
      </CopilotChatConfigurationProvider>
    </CopilotKit>
  );
}
