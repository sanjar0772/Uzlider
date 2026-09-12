import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd3ff",
          300: "#8eb5ff",
          400: "#598cff",
          500: "#3b66f5",
          600: "#2547e0",
          700: "#1e37b5",
          800: "#1f3391",
          900: "#1f2f73",
          950: "#161e4a",
        },
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 8px 24px -12px rgb(15 23 42 / 0.12)",
        pop: "0 12px 40px -12px rgb(15 23 42 / 0.25)",
        glow: "0 8px 30px -8px rgb(37 71 224 / 0.5)",
      },
      keyframes: {
        in: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        ping2: {
          "75%, 100%": { transform: "scale(2.4)", opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        in: "in 0.18s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.16s ease-out",
        ping2: "ping2 1.8s cubic-bezier(0,0,0.2,1) infinite",
      },
      backgroundImage: {
        "brand-mesh":
          "radial-gradient(at 20% 20%, #2547e0 0px, transparent 55%), radial-gradient(at 80% 0%, #3b66f5 0px, transparent 50%), radial-gradient(at 80% 90%, #1e37b5 0px, transparent 55%), radial-gradient(at 10% 90%, #161e4a 0px, transparent 55%)",
      },
    },
  },
  plugins: [],
};

export default config;
