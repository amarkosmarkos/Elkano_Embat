import path from "node:path";

/** apps/web se ejecuta con cwd = apps/web; el repo está dos niveles arriba. */
export const REPO_ROOT = process.env.XRAY_REPO_ROOT ?? path.resolve(process.cwd(), "..", "..");

const dataDir = process.env.XRAY_DATA_DIR ?? path.join(REPO_ROOT, "apps", "marketplace", "public", "data");

export const PATHS = {
  network: path.join(dataDir, "network.json"),
  companyDir: path.join(dataDir, "companies"),
  fixtures: path.join(REPO_ROOT, "data"),
  validation: path.join(REPO_ROOT, "output", "03_validation"),
  eda: path.join(REPO_ROOT, "eda", "eda_data.json"),
};
