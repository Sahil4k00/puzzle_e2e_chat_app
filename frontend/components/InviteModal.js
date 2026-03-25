import { useState } from "react";

export default function InviteModal({ isOpen, onClose, onCreate, loading, inviteUrl }) {
  const [form, setForm] = useState({
    puzzleQuestion: "",
    answer: "",
    timeLimitSeconds: 45
  });
  const [copyLabel, setCopyLabel] = useState("Copy invite link");

  if (!isOpen) {
    return null;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "timeLimitSeconds" ? Number(value) : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreate(form);
  }

  async function copyInvite() {
    if (!inviteUrl) {
      return;
    }

    await navigator.clipboard.writeText(inviteUrl);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy invite link"), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="panel w-full max-w-xl rounded-[30px] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-teal-300">Create Invite</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Wrap a new room in a puzzle.</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-2 block text-slate-200">Puzzle question</span>
            <textarea
              name="puzzleQuestion"
              value={form.puzzleQuestion}
              onChange={updateField}
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              placeholder="What walks on four legs in the morning, two at noon, and three at night?"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <label className="block text-sm">
              <span className="mb-2 block text-slate-200">Correct answer</span>
              <input
                name="answer"
                value={form.answer}
                onChange={updateField}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
                placeholder="Human"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-slate-200">Timer (seconds)</span>
              <input
                type="number"
                min="10"
                max="600"
                name="timeLimitSeconds"
                value={form.timeLimitSeconds}
                onChange={updateField}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Forging invite..." : "Create secure invite"}
          </button>
        </form>

        {inviteUrl ? (
          <div className="mt-6 rounded-3xl border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-slate-100">
            <p className="font-medium">Invite ready</p>
            <p className="mt-2 break-all text-slate-300">{inviteUrl}</p>
            <button
              type="button"
              onClick={copyInvite}
              className="mt-4 rounded-full border border-white/10 px-4 py-2 font-medium text-teal-200 transition hover:bg-white/10"
            >
              {copyLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}