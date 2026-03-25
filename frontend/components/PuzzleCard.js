export default function PuzzleCard({ invite, secondsLeft, onSubmit, loading, disabled }) {
  return (
    <div className="panel animate-floatIn rounded-[32px] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-teal-300">Puzzle Checkpoint</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Solve before the timer runs out.</h1>
        </div>
        <div className="rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-200">
          {secondsLeft}s left
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-white/10 bg-slate-950/35 p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Question</p>
        <p className="mt-3 text-lg leading-8 text-slate-100">{invite?.puzzleQuestion}</p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4 sm:flex-row">
        <input
          name="answer"
          autoComplete="off"
          placeholder="Your answer"
          className="flex-1 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-slate-100 outline-none transition focus:border-teal-300"
          disabled={disabled}
          required
        />
        <button
          type="submit"
          disabled={loading || disabled}
          className="rounded-2xl bg-gradient-to-r from-teal-400 to-orange-400 px-6 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Checking..." : "Unlock chat"}
        </button>
      </form>
    </div>
  );
}