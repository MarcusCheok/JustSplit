export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-4 w-12 animate-pulse rounded bg-black/10" />
      <div className="h-7 w-56 animate-pulse rounded bg-black/10" />

      <div className="flex flex-col gap-3 rounded-2xl bg-lavender/60 p-4">
        <div className="mx-auto h-5 w-3/4 animate-pulse rounded bg-white/70" />
        <div className="flex flex-col gap-2 rounded-xl bg-white/40 p-3">
          <div className="h-3 w-1/2 animate-pulse rounded bg-black/10" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-black/10" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-black/10" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <div className="h-4 w-1/3 animate-pulse rounded bg-black/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-black/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
