import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0f0f0f",
        surfaceElevated: "#1a1a1a",
        muted: "#71717a",
        accent: "#a1a1aa",
        border: "#27272a",
      },
    },
  },
  plugins: [],
};
export default config;
