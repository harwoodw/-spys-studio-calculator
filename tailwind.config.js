/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        spys: {
          orange: "#f97316" // Tailwind orange-500; tweak if you have a brand hex
        }
      }
    }
  },
  plugins: []
}