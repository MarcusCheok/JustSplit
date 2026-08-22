export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/trips", error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex flex-col items-center gap-1">
        <span className="text-4xl">💞</span>
        <h1 className="text-2xl font-bold text-ink">JustSplit</h1>
        <p className="text-sm text-ink/60">Just for us two.</p>
      </div>
      <form
        action="/api/login"
        method="POST"
        className="flex w-full max-w-xs flex-col gap-3"
      >
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="passcode"
          placeholder="Passcode"
          autoFocus
          className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        />
        {error && (
          <p className="text-sm text-rose-500">That&apos;s not it, try again.</p>
        )}
        <button
          type="submit"
          className="rounded-2xl bg-blush-dark px-4 py-3 font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.97]"
        >
          Let me in
        </button>
      </form>
    </main>
  );
}
