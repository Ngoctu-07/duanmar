/** Streaming fallback while the category page's strict query resolves. */
export default function ToursLoading() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="aspect-video animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
