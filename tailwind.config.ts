import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-fredoka)", "sans-serif"],
        body: ["var(--font-nunito)", "sans-serif"],
      },
      colors: {
        idea: {
          pink: "#FF5FA2",
          violet: "#A06BFF",
          cyan: "#46E0FF",
          lime: "#8BFF6B",
          amber: "#FFC24B",
          coral: "#FF6B5F",
        },
      },
    },
  },
  plugins: [],
};

export default config;
