import type { Metadata } from "next";
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
    "Access training materials and resources for RunFree Certified Vision Framers",
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
