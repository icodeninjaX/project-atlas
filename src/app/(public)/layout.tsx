import Link from "next/link";
import { AtlasMark } from "@/components/atlas/atlas-mark";
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
          <span className="text-sm font-semibold">Project Atlas</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-xl px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Log in
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
