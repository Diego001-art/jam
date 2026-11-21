import type { NextConfig } from "next";

/** Статическая сборка: каждая страница — готовый HTML (ТЗ, раздел 8). */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/jam";

const config: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default config;
