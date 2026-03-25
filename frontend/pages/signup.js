import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import AuthShell from "../components/AuthShell";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../utils/api";
import { ensureIdentityForEmail } from "../utils/crypto";

export default function SignupPage() {
  const router = useRouter();
  const redirect = typeof router.query.redirect === "string" ? router.query.redirect : "/dashboard";
  const { ready, isAuthenticated, saveSession } = useAuth();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: ""
  });
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
      const session = await apiRequest("/auth/signup", {
        method: "POST",
        body: {
          displayName: form.displayName,
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
      eyebrow="Puzzle Invite Chat"
      title="Create your identity and keep the private key on your side."
      subtitle="This starter creates an RSA identity in the browser, stores the public key on the backend, and lets future room keys arrive wrapped only for you."
      altLabel="Already registered?"
      altHref="/login"
      altText="Sign in"
    >
      <div>
        <h2 className="font-display text-3xl font-semibold text-white">Create account</h2>
        <p className="mt-2 text-sm soft-text">Start with email auth, then invite someone into a puzzle-protected room.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block text-sm text-slate-100">
          <span className="mb-2 block">Display name</span>
          <input
            type="text"
            name="displayName"
            value={form.displayName}
            onChange={updateField}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 outline-none transition focus:border-teal-300"
            placeholder="Cipher Fox"
            required
          />
        </label>
        <label className="block text-sm text-slate-100">
          <span className="mb-2 block">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={updateField}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 outline-none transition focus:border-teal-300"
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
            className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 outline-none transition focus:border-teal-300"
            placeholder="Minimum 8 characters"
            required
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-teal-400 to-orange-400 px-5 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}