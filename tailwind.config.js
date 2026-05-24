/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        monserrat: {
          black: "#0b0909",
          red: "#9f171b",
          redDark: "#4f090c",
          gold: "#d8a842",
          goldDark: "#6f4b14",
          cream: "#f7f0df",
          ink: "#1f1b18"
        }
      },
      boxShadow: {
        gold: "0 18px 60px rgba(216, 168, 66, 0.18)"
      }
    }
  },
  plugins: []
};
