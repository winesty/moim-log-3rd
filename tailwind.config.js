/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F3",
        ink: "#2B2A26",
        clay: "#B4622F",
        moss: "#5C6B4D",
      },
    },
  },
  plugins: [],
};
