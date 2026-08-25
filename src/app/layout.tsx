import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Check } from "lucide-react";
import { Toaster } from "sonner";
import { BrandLaunchScreen } from "@/components/atlas/brand-launch-screen";
import { ThemeProvider } from "@/components/atlas/theme-provider";
import { PwaRegistration } from "@/components/offline/pwa-registration";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import toastStyles from "./toast.module.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function AtlasSuccessIcon() {
  return (
    <span aria-hidden="true" className={toastStyles.successIcon}>
      <span className={toastStyles.successAtlasMark} />
      <span className={toastStyles.successCheckPhase}>
        <Check className={toastStyles.successCheck} />
      </span>
    </span>
  );
}

const atlasToastIcons = { success: <AtlasSuccessIcon /> };

export const metadata: Metadata = {
  applicationName: "ATLAS",
  title: {
    default: "ATLAS",
    template: "%s · ATLAS",
  },
  description:
    "A private personal operating system for money, work, goals, and weekly direction.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ATLAS",
  },
  icons: {
    icon: [
      {
        url: "/icons/atlas-system-core-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/atlas-system-core-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/atlas-system-core-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2867e8" },
    { media: "(prefers-color-scheme: dark)", color: "#070a0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <BrandLaunchScreen />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={350} skipDelayDuration={100}>
            <PwaRegistration />
            {children}
            <Toaster
              richColors
              closeButton
              position="top-right"
              icons={atlasToastIcons}
              gap={12}
              offset={{ top: 16, right: 16 }}
              mobileOffset={{ top: 12, right: 12, left: 12 }}
              toastOptions={{
                classNames: {
                  toast: toastStyles.toast,
                  success: toastStyles.success,
                  title: toastStyles.title,
                  description: toastStyles.description,
                  content: toastStyles.content,
                  icon: toastStyles.icon,
                  closeButton: toastStyles.closeButton,
                  actionButton: toastStyles.actionButton,
                  cancelButton: toastStyles.cancelButton,
                },
                closeButtonAriaLabel: "Dismiss notification",
              }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
