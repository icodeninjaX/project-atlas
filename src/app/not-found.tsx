import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-background grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-primary font-mono text-xs font-semibold tracking-widest uppercase">
          Off route · 404
        </p>
        <h1 className="mt-4 text-3xl font-semibold">
          That place is not on this map.
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          The page may have moved or the address is incomplete.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Return to Today</Link>
        </Button>
      </div>
    </main>
  );
}
