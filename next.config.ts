import type { NextConfig } from "next";

const nextConfig = {
  async headers() {
      return [
          {
              // matching all API routes EXCEPT hubspot-logo-upload, which sets its own
              // CORS headers restricted to the storefront. It accepts file uploads, so it
              // must not inherit the blanket Access-Control-Allow-Origin: * below.
              source: "/api/:path((?!hubspot-logo-upload).*)",
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
