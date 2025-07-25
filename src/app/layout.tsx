import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Assistant Platform",
  description: "AI-powered financial assistants platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/assistants_Icon.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-white dark:bg-gray-900">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
