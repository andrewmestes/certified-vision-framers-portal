import type { Metadata, Viewport } from "next";
import { Poppins, Montserrat } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font, so no external font request at runtime.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Certified Vision Framers Portal | RunFree",
  description:
    "Handouts, facilitator guides, and training videos for RunFree Certified Vision Framers.",
  // The portal is gated, so there's nothing for search engines to index and
  // no reason to let it be crawled.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Certified Vision Framers Portal",
    siteName: "RunFree",
    description:
      "Handouts, facilitator guides, and training videos for RunFree Certified Vision Framers.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#E43D96",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-white font-sans text-gray-700 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
