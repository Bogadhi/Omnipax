import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { twMerge } from "tailwind-merge";
import Providers from "./providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
// import Navbar from "@/components/Navbar"; // Commented out for safe transition
import HomeNav from "@/features/home/components/HomeNav";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StarPass | Elite Ticket Booking",
  description: "Experience the future of entertainment booking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={twMerge(
          inter.className,
          "bg-background text-foreground antialiased"
        )}
      >
        <Providers>
          <ErrorBoundary>
            {/* GLOBAL NAVBAR */}
            <HomeNav />

            {/* PAGE CONTENT WITH CONDITIONAL OFFSET */}
            <LayoutClientWrapper>
              {children}
            </LayoutClientWrapper>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}