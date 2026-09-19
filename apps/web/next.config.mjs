/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep production builds from replacing the running development server's chunks.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // Sitio 100 % estático: `next build` genera apps/web/out/ listo para Vercel.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
