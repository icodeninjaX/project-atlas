export default function AppLoading() {
  return (
    <div
      className="mx-auto max-w-[1500px] animate-pulse p-4 sm:p-6 lg:p-8"
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
