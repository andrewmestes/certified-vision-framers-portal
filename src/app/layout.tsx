import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Certified Vision Framers Portal",
  description:
    "Access training materials and resources for RunFree Certified Vision Framers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
