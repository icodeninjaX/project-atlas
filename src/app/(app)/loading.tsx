export default function AppLoading() {
  return (
    <div
      className="mx-auto max-w-[1240px] animate-pulse px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      aria-label="Loading"
    >
      <div className="bg-muted h-6 w-36 rounded-full" />
      <div className="bg-muted mt-4 h-10 w-72 max-w-full rounded-lg sm:h-12 lg:h-14" />
      <div className="bg-muted mt-3 h-4 w-96 max-w-full rounded" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="border-border bg-card h-36 rounded-2xl border"
          />
        ))}
      </div>
      <span className="sr-only">Loading your ATLAS</span>
    </div>
  );
}
