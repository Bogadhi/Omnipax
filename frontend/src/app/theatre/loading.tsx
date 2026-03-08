export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse p-8">
      <div className="h-8 w-48 bg-zinc-800 rounded-xl" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-zinc-900 rounded-2xl border border-zinc-800" />
      ))}
    </div>
  );
}
