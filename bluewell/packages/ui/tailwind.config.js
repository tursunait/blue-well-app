/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // BlueWell - Calm, Minimal Duke-Inspired Palette
        bluewell: {
          royal: "#012169",      // Duke Royal Blue (primary)
          navy: "#002A5C",       // Duke Navy (darker accent)
          light: "#6CA0DC",      // Light Blue (primary actions)
        },
        neutral: {
          white: "#FFFFFF",
          bg: "#F6F7F9",         // Soft gray background
          surface: "#EFEFF3",    // Card surfaces
          border: "#DDE3EA",     // Soft borders
          muted: "#9CA3AF",      // Muted text
          text: "#1F2937",        // Primary text (soft dark)
          dark: "#111827",       // Headings
        },
        accent: {
          // Minimal, calm accents - use sparingly
          soft: "#E0E7FF",       // Very soft blue tint
          light: "#6CA0DC",      // Light Blue for primary actions
        },
        state: {
          success: "#10B981",    // Soft green (only when needed)
          warning: "#F59E0B",    // Soft amber (only when needed)
          error: "#EF4444",      // Red (only for critical errors)
        },
      },
      borderRadius: {
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        round: "999px",
        pill: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        md: "0 2px 4px 0 rgba(0, 0, 0, 0.06)",
        lg: "0 4px 8px 0 rgba(0, 0, 0, 0.08)",
        soft: "0 2px 8px 0 rgba(1, 33, 105, 0.08)", // Soft blue shadow
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',  // 72px
        '22': '5.5rem',  // 88px
      },
    },
  },
  plugins: [],
};

