import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, IBM_Plex_Mono, Archivo_Narrow } from "next/font/google";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const archivoNarrow = Archivo_Narrow({
  variable: "--font-archivo-narrow",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Eurospending — Euro Economics",
    template: "%s · Eurospending",
  },
  description:
    "Tracking economic data across EU countries — spending, debt, inflation, and the story of the euro.",
  metadataBase: new URL("https://eurospending.org"),
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Eurospending',
    images: [{ url: 'https://eurospending.org/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://eurospending.org/og'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = (await headers()).get("x-locale") || DEFAULT_LOCALE;
  return (
    <html
      lang={lang}
      className={`${inter.variable} ${ibmMono.variable} ${archivoNarrow.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
