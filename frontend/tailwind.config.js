/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
    "./utils/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#e2e8f0",
        ember: "#f97316",
        tide: "#0f766e",
        dusk: "#1f2937"
      },
      boxShadow: {
        glow: "0 18px 50px rgba(15, 23, 42, 0.18)"
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        floatIn: "floatIn 0.45s ease-out",
        pulseSoft: "pulseSoft 1.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};