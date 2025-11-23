/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#459ea1",
        "bg-main": "#1c2431",
        "bg-secondary": "#c2d6cf",
      },
      backgroundImage: {
        "section-gradient": "linear-gradient(135deg, #1c2431, #459ea1)",
      },
    },
  },
  plugins: [],
};
