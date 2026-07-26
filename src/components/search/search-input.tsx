"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form role="search" className="relative flex gap-2">
      <Search className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 size-4" />
      <Input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={defaultValue}
        maxLength={100}
        placeholder="Search tasks, goals, money, debts, career, and reviews"
        className="h-12 pr-12 pl-10"
      />
      <kbd className="border-border bg-muted text-muted-foreground pointer-events-none absolute top-3.5 right-24 rounded border px-1.5 font-mono text-[10px]">
        /
      </kbd>
      <Button type="submit" className="h-12">
        Search
      </Button>
    </form>
  );
}
