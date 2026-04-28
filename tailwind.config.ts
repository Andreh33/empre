import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // Identidad visual de la asesoria.
        brand: {
          DEFAULT: "#0F2A47", // azul profundo corporativo
          50: "#E6ECF2",
          100: "#C2CDDB",
          200: "#8FA3BB",
          300: "#5C7A9B",
          400: "#2F5279",
          500: "#0F2A47",
          600: "#0C2239",
          700: "#091A2C",
          800: "#06121F",
          900: "#030911",
        },
        gold: {
          DEFAULT: "#C9A961", // acento dorado discreto
          50: "#FBF7EE",
          100: "#F4EAD0",
          200: "#E8D4A1",
          300: "#DBBE73",
          400: "#CFAA48",
          500: "#C9A961",
          600: "#A18342",
          700: "#785F2E",
          800: "#4F3D1A",
          900: "#261B07",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
