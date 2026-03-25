import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import PuzzleCard from "../../components/PuzzleCard";
import { useAuth } from "../../hooks/useAuth";
import { useCountdown } from "../../hooks/useCountdown";
import { apiRequest } from "../../utils/api";

export default function InvitePage() {
  const router = useRouter();
  const { code } = router.query;
  const { token, isAuthenticated } = useAuth();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [countdownReady, setCountdownReady] = useState(false);
  const secondsLeft = useCountdown(invite?.timeLimitSeconds || 0, Boolean(invite && !result));

  useEffect(() => {
    if (!code) {
      return;
    }

    const controller = new AbortController();

    async function loadInvite() {
      setLoadingInvite(true);
      setError("");
      setCountdownReady(false);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/invites/${code}/public`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load invite");
        }

        setInvite(data);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      } finally {
        setLoadingInvite(false);
      }
    }

    loadInvite();

    return () => controller.abort();
  }, [code]);

  useEffect(() => {
    if (!invite || result) {
      return;
    }

    if (secondsLeft === invite.timeLimitSeconds) {
      setCountdownReady(true);
    }
  }, [invite, result, secondsLeft]);

  useEffect(() => {
    if (
      !invite ||
      !countdownReady ||
      result ||
      submitting ||
      secondsLeft > 0 ||
      !isAuthenticated
    ) {
      return;
    }

    validateAnswer("");
  }, [invite, countdownReady, result, submitting, secondsLeft, isAuthenticated]);

  async function validateAnswer(answer) {
    if (!code) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await apiRequest(`/invites/${code}/validate`, {
        method: "POST",
        token,
        body: {
          answer
        }
      });

      setResult(response);
    } catch (validationError) {
      setError(validationError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    const formData = new FormData(event.currentTarget);
    await validateAnswer(String(formData.get("answer") || ""));
  }

  if (loadingInvite) {
    return <div className="min-h-screen px-4 py-10 text-slate-100">Loading invite...</div>;
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-[32px] border border-white/10 bg-slate-950/35 p-6 shadow-glow backdrop-blur sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Invite Access</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-white">
            {invite?.inviter?.displayName || "Someone"} invited you to a secure room.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Solve the puzzle before time runs out for bragging rights. Even if you miss it, the room still opens after the verdict banner.
          </p>
        </div>

        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

        {!isAuthenticated && !result ? (
          <div className="mb-4 rounded-3xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
            You can already see the puzzle. Sign in before submitting your answer so the invite can attach you to the room.
          </div>
        ) : null}

        {result ? (
          <div className="panel animate-floatIn rounded-[32px] p-8 text-slate-100">
            <p className="text-sm uppercase tracking-[0.3em] text-teal-300">
              {result.result === "passed" ? "Challenge cleared" : "Challenge missed"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{result.bannerMessage}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The room is open either way. If the other participant is online, the encrypted session key can be exchanged immediately.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/chat/${result.roomId}?banner=${encodeURIComponent(result.bannerMessage)}`
                )
              }
              className="mt-6 rounded-full bg-gradient-to-r from-teal-400 to-orange-400 px-5 py-3 font-semibold text-slate-950"
            >
              Open secure chat
            </button>
          </div>
        ) : (
          <>
            <PuzzleCard
              invite={invite}
              secondsLeft={secondsLeft}
              onSubmit={handleSubmit}
              loading={submitting}
              disabled={countdownReady && secondsLeft === 0}
            />
            {!isAuthenticated ? (
              <Link
                href={`/login?redirect=${encodeURIComponent(router.asPath)}`}
                className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Sign in to submit answer
              </Link>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
