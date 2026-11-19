import type { NextConfig } from "next";

const nextConfig = {
  async headers() {
      return [
          {
              // matching all API routes EXCEPT the logo upload routes, which set their own
              // CORS headers restricted to the storefront. They accept file uploads, so they
              // must not inherit the blanket Access-Control-Allow-Origin: * below.
              // vercel.json has the same rule; keep both exclusion lists identical.
              source: "/api/:path((?!hubspot-logo-upload|twenty-logo-upload).*)",
              headers: [
                { key: "Access-Control-Allow-Credentials", value: "true" },
                { key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
                { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
            ]
          }
      ]
  }
}


export default nextConfig;
