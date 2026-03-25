import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // StellarGuard brand
        primary: {
          50: "#f0f4ff",
          100: "#dbe4fe",
          200: "#bfcefe",
          300: "#93aefe",
          400: "#6084fb",
          500: "#3b5cf7",
          600: "#253bec",
          700: "#1d2bd9",
          800: "#1e25b0",
          900: "#1e258b",
          950: "#161955",
        },
        stellar: {
          blue: "#3b5cf7",
          purple: "#7c3aed",
          pink: "#ff0080",
          dark: "#0f0f23",
          darker: "#0a0a1a",
          card: "#1a1a2e",
          border: "#2a2a4e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
        "stellar-gradient": "linear-gradient(90deg, #3b5cf7 0%, #7c3aed 100%)",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "stellar": "0 0 20px rgba(59, 92, 247, 0.3)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
