import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  outputFileTracingIncludes: {
    "/*": [
      "../marketplace/public/data/network.json",
      "../marketplace/public/data/companies/*.json",
      "../../output/02_score/cash_position.csv",
      "../../output/03_validation/events_v1.csv",
      "../../output/03_validation/report_v1.json",
      "../../output/03_validation/report_v2.json",
      "../../output/03_validation/report_v3.json",
      "../../output/03_validation/comparison.md",
      "../../output/03_validation/labels_summary.json",
      "../../eda/eda_data.json",
    ],
  },
  // sin el botón «N» de Next en la esquina inferior izquierda durante next dev
  devIndicators: false,
};
export default nextConfig;
