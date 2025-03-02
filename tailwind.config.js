/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        notion: {
          bg: "#F7F6F3",
          text: "#37352F",
          red: "#EB5757",
          blue: "#2F80ED",
          yellow: "#F4B400",
          gray: "#E0E0E0",
          "dark-bg": "#2F3437",
          "dark-text": "#D9D9D9",
          "dark-secondary": "#999999",
          "dark-card": "#373C3F",
          "dark-red": "#E66666",
          "dark-blue": "#4A8CFF",
          "dark-yellow": "#D9A700",
          "dark-gray": "#555555",
        },
      },
      transitionProperty: {
        "colors": "background-color, border-color, color, fill, stroke",
      },
    },
  },
  plugins: [],
};