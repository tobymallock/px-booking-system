import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand accent colors — placeholders until brand guidelines are confirmed
        pv: { DEFAULT: "#1d3557" },
        px: { DEFAULT: "#e63946" },
        vv: { DEFAULT: "#2a9d8f" },
      },
    },
  },
  plugins: [],
};

export default config;
