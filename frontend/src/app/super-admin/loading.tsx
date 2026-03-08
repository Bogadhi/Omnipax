export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse p-8">
      <div className="h-8 w-64 bg-slate-800 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-900 rounded-2xl border border-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-48 bg-slate-900 rounded-2xl border border-slate-800" />
        <div className="h-48 bg-slate-900 rounded-2xl border border-slate-800" />
      </div>
    </div>
  );
}
