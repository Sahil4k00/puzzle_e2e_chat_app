import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import AuthShell from "../components/AuthShell";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../utils/api";
import { ensureIdentityForEmail } from "../utils/crypto";

export default function LoginPage() {
  const router = useRouter();
  const redirect = typeof router.query.redirect === "string" ? router.query.redirect : "/dashboard";
  const { ready, isAuthenticated, saveSession } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace(redirect);
    }
  }, [ready, isAuthenticated, redirect, router]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const identity = await ensureIdentityForEmail(form.email);
      const session = await apiRequest("/auth/login", {
        method: "POST",
        body: {
          email: form.email,
          password: form.password,
          publicKey: identity.publicKey
        }
      });

      saveSession(session);
      router.replace(redirect);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Encrypted Chat"
      title="Sign in and resume your protected conversations."
      subtitle="Your browser keeps the private key local, your room keys move through RSA envelopes, and the server only sees encrypted payloads."
      altLabel="Need an account?"
      altHref={redirect !== "/dashboard" ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup"}
      altText="Create one"
    >
      <div>
        <h2 className="font-display text-3xl font-semibold text-white">Welcome back</h2>
        <p className="mt-2 text-sm soft-text">Use your email and password to recover your dashboard.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block text-sm text-slate-100">
          <span className="mb-2 block">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={updateField}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 outline-none transition focus:border-orange-400"
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="block text-sm text-slate-100">
          <span className="mb-2 block">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={updateField}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 outline-none transition focus:border-orange-400"
            placeholder="********"
            required
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm soft-text">
        Invite link waiting for you? After login you can continue from there without losing the puzzle route.
      </p>
    </AuthShell>
  );
}
