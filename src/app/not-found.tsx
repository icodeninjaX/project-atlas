import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-background grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-muted-foreground font-mono text-[0.8125rem] font-medium">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-[1.75rem]">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The page may have moved, or the address is incomplete.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Return to Today</Link>
        </Button>
      </div>
    </main>
  );
}
