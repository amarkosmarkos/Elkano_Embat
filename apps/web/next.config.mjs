/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sitio 100 % estático: `next build` genera apps/web/out/ listo para Vercel.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
