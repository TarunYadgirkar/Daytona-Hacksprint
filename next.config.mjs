/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Daytona and Braintrust SDKs are Node-only. Keep them out of the
  // client bundle and out of any edge runtime.
  serverExternalPackages: ["@daytona/sdk", "braintrust"],
};

export default nextConfig;
