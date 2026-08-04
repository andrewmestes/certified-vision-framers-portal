import type { Config } from "tailwindcss";

// RunFree brand tokens, matched to the shipped co::Lab build so the two
// properties read as siblings.
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        runfree: {
          magenta: "#E43D96",
          magentaDeep: "#C21F73", // text/hover on light grounds
          orange: "#F15A25",
          orangeLight: "#FF7C58",
          navy: "#1F378C",
          ink: "#2B2A55",
          pink: "#FCE9F1", // soft tint
          indigo: "#E9EDF9", // soft tint
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "runfree-grad": "linear-gradient(90deg, #E43D96, #F15A25)",
        /**
         * The same sunset, deep enough to put words on.
         *
         * White on the bright gradient measures 3.88:1 at the magenta end and
         * 3.37:1 at the orange — fine for icons and rules, which only need 3:1
         * as graphics, but under the 4.5:1 that normal-size text requires. A
         * pastor reading this on a phone outdoors is exactly who that ratio
         * exists for.
         *
         * Both stops are the brand's own darker values rather than invented
         * ones: #C21F73 is magentaDeep, already used for text on light. 5.62:1
         * and 5.16:1 respectively.
         */
        "runfree-grad-deep": "linear-gradient(90deg, #C21F73, #C43F18)",
        "runfree-sunset":
          "linear-gradient(80deg, #20378C 4%, #2F57D0 28%, #E43D96 62%, #FF7C58 98%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
