import Link from "next/link";
import { AtlasMark } from "@/components/atlas/atlas-mark";
import { PublicHeaderLink } from "@/components/atlas/public-header-link";
import { ThemeToggle } from "@/components/atlas/theme-toggle";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-dvh">
      <header className="relative z-20 mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="focus-visible:ring-ring flex items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <AtlasMark />
          <span className="text-sm font-semibold">ATLAS</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <PublicHeaderLink />
        </div>
      </header>
      {children}
    </div>
  );
}
