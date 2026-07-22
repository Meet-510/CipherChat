import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        logo: ['"Grand Hotel"', "cursive"],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    // single Instagram-inspired black theme — no theme switching
    themes: [
      {
        cipherdark: {
          primary: "#0095f6", // Instagram blue
          "primary-content": "#ffffff",
          secondary: "#e1306c", // Instagram pink
          "secondary-content": "#ffffff",
          accent: "#833ab4", // Instagram purple
          "accent-content": "#ffffff",
          neutral: "#1a1a1a",
          "neutral-content": "#fafafa",
          "base-100": "#000000", // main background (pure black)
          "base-200": "#121212", // sidebar / cards
          "base-300": "#262626", // borders / elevated surfaces
          "base-content": "#fafafa", // primary text
          info: "#0095f6",
          "info-content": "#ffffff",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ed4956", // Instagram red
          "error-content": "#ffffff",
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1.9rem",
          "--animation-btn": "0.25s",
          "--border-btn": "1px",
        },
      },
    ],
  },
};
