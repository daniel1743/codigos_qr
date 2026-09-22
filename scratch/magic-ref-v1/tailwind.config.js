export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F3F0",
        surface: "#FFFFFF",
        ink: "#17140F",
        body: "#4A443C",
        muted: "#7A736A",
        hairline: "#E6E1DA",
        brand: "#1E4D44",
        brandSoft: "#EAF1EE",
        sel: "#2F6FED",
        selSoft: "#EAF1FE",
        danger: "#B42318",
      },
      fontFamily: {
        display: ["Marcellus", "Georgia", "serif"],
        editorial: ['"Playfair Display"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        grotesk: ['"DM Sans"', "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,20,15,0.04), 0 8px 24px -12px rgba(23,20,15,0.10)",
        float: "0 2px 6px rgba(23,20,15,0.06), 0 16px 40px -12px rgba(23,20,15,0.22)",
        sheet: "0 -8px 40px -12px rgba(23,20,15,0.26)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
    },
  },
};
