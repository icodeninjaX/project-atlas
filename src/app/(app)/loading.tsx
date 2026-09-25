export default function AppLoading() {
  return (
    <div
      className="mx-auto max-w-[1240px] animate-pulse px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      aria-label="Loading"
    >
      <div className="bg-muted h-3 w-32 rounded" />
      <div className="bg-muted mt-4 h-10 w-72 max-w-full rounded-lg" />
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
