// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        // Default UI text follows the Apple system stack.
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"',
          'Inter', 'system-ui', '"Segoe UI"', 'Roboto', '"Helvetica Neue"',
          'Arial', 'sans-serif',
        ],
        // Brand display typeface — kept for headings / logo lockups.
        zen: ['"Zen Kaku Gothic Antique"', 'sans-serif'],
      },
      // Apple HIG type scale (added alongside the default Tailwind scale).
      fontSize: {
        caption2:   ['0.6875rem', { lineHeight: '0.8125rem', letterSpacing: '0' }],     // 11
        caption:    ['0.75rem',   { lineHeight: '1rem',       letterSpacing: '0' }],      // 12
        footnote:   ['0.8125rem', { lineHeight: '1.125rem',   letterSpacing: '-0.006em' }], // 13
        subhead:    ['0.9375rem', { lineHeight: '1.25rem',    letterSpacing: '-0.01em' }],  // 15
        callout:    ['1rem',      { lineHeight: '1.3125rem',  letterSpacing: '-0.012em' }], // 16
        body:       ['1.0625rem', { lineHeight: '1.375rem',   letterSpacing: '-0.014em' }], // 17
        headline:   ['1.0625rem', { lineHeight: '1.375rem',   letterSpacing: '-0.014em', fontWeight: '600' }], // 17
        title3:     ['1.25rem',   { lineHeight: '1.5625rem',  letterSpacing: '-0.016em' }], // 20
        title2:     ['1.375rem',  { lineHeight: '1.75rem',    letterSpacing: '-0.018em' }], // 22
        title1:     ['1.75rem',   { lineHeight: '2.125rem',   letterSpacing: '-0.022em' }], // 28
        largetitle: ['2.125rem',  { lineHeight: '2.5625rem',  letterSpacing: '-0.024em' }], // 34
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        page: "hsl(var(--background))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          strong: "hsl(var(--primary-strong))",
          tint: "hsl(var(--primary-tint))",
        },
        // Brand alias — same terracotta, friendlier name for app code.
        brand: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          strong: "hsl(var(--primary-strong))",
          tint: "hsl(var(--primary-tint))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // AI-agent surfaces (indigo).
        ai: {
          DEFAULT: "hsl(var(--ai))",
          foreground: "hsl(var(--ai-foreground))",
          tint: "hsl(var(--ai-tint))",
          border: "hsl(var(--ai-border))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Legacy tokens — retained, now resolve to on-brand values.
        shallowbg: 'var(--color-shallow)',
        deepbg: 'var(--color-deep)',
        activeText: 'var(--color-active-text)',
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      // Soft, warm-tinted elevation (Apple-style restrained shadows).
      boxShadow: {
        xs: '0 1px 2px 0 hsl(20 14% 16% / 0.04)',
        sm: '0 1px 3px 0 hsl(20 14% 16% / 0.05), 0 1px 2px -1px hsl(20 14% 16% / 0.04)',
        DEFAULT: '0 2px 6px -1px hsl(20 14% 16% / 0.06), 0 1px 3px -1px hsl(20 14% 16% / 0.05)',
        md: '0 4px 12px -2px hsl(20 14% 16% / 0.07), 0 2px 6px -2px hsl(20 14% 16% / 0.05)',
        lg: '0 12px 28px -6px hsl(20 14% 16% / 0.10), 0 4px 10px -4px hsl(20 14% 16% / 0.05)',
        xl: '0 24px 48px -12px hsl(20 14% 16% / 0.14), 0 8px 16px -8px hsl(20 14% 16% / 0.06)',
        '2xl': '0 32px 64px -16px hsl(20 14% 16% / 0.18)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      typography: (theme) => ({
        'line-clamp-3': {
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      }),
    },
  },
  plugins: [require("tailwindcss-animate")],
};
