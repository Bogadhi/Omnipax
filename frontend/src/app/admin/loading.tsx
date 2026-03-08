export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse p-8">
      <div className="h-8 w-56 bg-gray-800 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-900 rounded-2xl border border-gray-800" />
        ))}
      </div>
      <div className="h-48 bg-gray-900 rounded-2xl border border-gray-800" />
    </div>
  );
}
