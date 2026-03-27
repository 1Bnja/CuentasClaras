/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#f9f4ef",
        ink: "#1e1a17",
        clay: "#c96d45",
        pine: "#2f5d50",
        fog: "#ebe2d8"
      },
      fontFamily: {
        display: ["\"DM Serif Display\"", "serif"],
        body: ["\"Work Sans\"", "sans-serif"]
      }
    }
  },
  plugins: []
};
