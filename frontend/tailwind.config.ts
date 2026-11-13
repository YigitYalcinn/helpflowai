import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Petrol: the colour of the app's chrome and every primary action.
        brand: {
          50: "#eaf4f3",
          100: "#d3e8e6",
          200: "#a9d2cf",
          500: "#1f7a80",
          600: "#17656b",
          700: "#114f54",
          900: "#0b2e32"
        },
        // Deep petrol surfaces (sidebar, queue panel).
        ink: { 800: "#123d42", 900: "#0c2c30", 950: "#082226" },
        // Amber is reserved for things that are waiting on someone.
        signal: { 300: "#f8cf6a", 400: "#f5b82e", 500: "#e9a100" },
        paper: "#f1f4f2"
      },
      fontFamily: {
        sans: ["Instrument Sans Variable", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Bricolage Grotesque Variable", "Instrument Sans Variable", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(12, 44, 48, 0.06), 0 8px 24px rgba(12, 44, 48, 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
