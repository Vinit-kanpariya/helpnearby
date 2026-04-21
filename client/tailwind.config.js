/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#166534",
          DEFAULT: "#22c55e",
          light: "#BDEF6A",
          bg: "#F2F7F2",
          "card-bg": "#F0FDF4",
          "card-border": "#D1FAE5",
          "nav-bg": "#FFFFFF",
          accent: "#F8FFF8",
        },
        gray: {
          text: "#0D1A0D",
          secondary: "#374151",
          muted: "#6B7280",
          placeholder: "#9CA3AF",
          border: "#D1D5DB",
        },
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
      },
    },
  },
  plugins: [],
};
