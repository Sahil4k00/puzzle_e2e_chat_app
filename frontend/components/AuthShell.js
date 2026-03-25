import Link from "next/link";

export default function AuthShell({
  title,
  eyebrow,
  subtitle,
  altLabel,
  altHref,
  altText,
  children
}) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="animate-floatIn rounded-[32px] border border-white/10 bg-slate-950/40 p-8 shadow-glow backdrop-blur xl:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">{eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">{subtitle}</p>
          <div className="mt-10 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Invite puzzle</p>
              <p className="mt-2 soft-text">Gate every room with a playful challenge.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">AES-GCM messages</p>
              <p className="mt-2 soft-text">Only the browser ever sees plaintext chat.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Live presence</p>
              <p className="mt-2 soft-text">Typing, status, and handshakes over Socket.IO.</p>
            </div>
          </div>
        </section>

        <section className="panel animate-floatIn rounded-[32px] p-8 xl:p-10">
          {children}
          <p className="mt-6 text-sm soft-text">
            {altLabel}{" "}
            <Link href={altHref} className="font-semibold text-orange-300 transition hover:text-orange-200">
              {altText}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
