import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { IdeasProvider } from "@/lib/useIdeas";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lofty — Galaxy of ideas",
  description:
    "Bottle every idea as a balloon. Size = how big it is, the number = its priority to finish. Work them one at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body>
        <IdeasProvider>{children}</IdeasProvider>
      </body>
    </html>
  );
}
