export default function AppLoading() {
  return (
    <div
      className="mx-auto max-w-[1240px] animate-pulse px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      aria-label="Loading"
    >
      <div className="bg-muted h-8 w-56 max-w-full rounded-lg" />
      <div className="bg-muted mt-3 h-4 w-80 max-w-full rounded" />
      <div className="border-border bg-card mt-8 h-44 rounded-2xl border" />
      <div className="border-border bg-card divide-border mt-4 divide-y rounded-2xl border">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-3 px-4 py-4">
            <div className="bg-muted size-8 shrink-0 rounded-lg" />
            <div className="bg-muted h-4 w-1/2 rounded" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
