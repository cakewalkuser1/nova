import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calming palette - sage, lavender, cream
        surface: {
          DEFAULT: "#F0F4F1",
          dark: "#E8E6F0",
        },
        surfaceElevated: "rgba(255, 255, 255, 0.7)",
        sage: {
          DEFAULT: "#7B9E87",
          light: "#A8C4A8",
          dark: "#5A7A5A",
          muted: "rgba(123, 158, 135, 0.15)",
        },
        lavender: {
          DEFAULT: "#B8A9C9",
          light: "#D4C8E0",
          dark: "#9A8AA8",
          muted: "rgba(184, 169, 201, 0.2)",
        },
        rose: {
          DEFAULT: "#D4A5A5",
          light: "#E8C4C4",
          dark: "#B88888",
          muted: "rgba(212, 165, 165, 0.25)",
        },
        cream: {
          DEFAULT: "#FAF9F6",
          dark: "#F5F4F0",
        },
        // Text colors
        textPrimary: "#2D3748",
        textMuted: "#718096",
        textLight: "#A0AEC0",
        // Legacy support (for gradual migration)
        muted: "#71717a",
        accent: "#a1a1aa",
        border: "#27272a",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        glass: "20px",
      },
      animation: {
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease-in-out infinite",
        "wave": "wave 1.5s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Note: "wave" animation is defined in globals.css with height changes
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      borderRadius: {
        "bubble": "20px",
        "pill": "9999px",
      },
    },
  },
  plugins: [
    function({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        ".glass": {
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
        },
        ".glass-dark": {
          background: "rgba(45, 55, 72, 0.1)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        },
        ".gradient-mesh": {
          background: `
            radial-gradient(at 40% 20%, rgba(123, 158, 135, 0.15) 0px, transparent 50%),
            radial-gradient(at 80% 0%, rgba(184, 169, 201, 0.15) 0px, transparent 50%),
            radial-gradient(at 0% 50%, rgba(212, 165, 165, 0.1) 0px, transparent 50%),
            radial-gradient(at 80% 50%, rgba(123, 158, 135, 0.1) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(184, 169, 201, 0.15) 0px, transparent 50%),
            linear-gradient(135deg, #F0F4F1 0%, #E8E6F0 50%, #FAF9F6 100%)
          `,
        },
        ".noise-overlay": {
          position: "relative",
        },
        ".noise-overlay::after": {
          content: '""',
          position: "absolute",
          inset: "0",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: "0.03",
          pointerEvents: "none",
          zIndex: "1",
        },
      });
    },
  ],
};
export default config;
