import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import InviteModal from "../components/InviteModal";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../utils/api";
import {
  createRoomSessionKey,
  encryptRoomKeyForPublicKey,
  getStoredRoomSessionKey,
  persistRoomSessionKey
} from "../utils/crypto";

export default function DashboardPage() {
  const router = useRouter();
  const { ready, token, user, isAuthenticated, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login?redirect=/dashboard");
    }
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    if (!token) {
      return;
    }

    loadRooms();
  }, [token]);

  async function ensureCreatorEnvelope(roomId) {
    let roomSessionKey = getStoredRoomSessionKey(roomId);

    if (!roomSessionKey) {
      roomSessionKey = await createRoomSessionKey();
      persistRoomSessionKey(roomId, roomSessionKey);
      const encryptedSessionKey = await encryptRoomKeyForPublicKey(roomSessionKey, user.publicKey);

      await apiRequest(`/rooms/${roomId}/key-envelope`, {
        method: "POST",
        token,
        body: {
          targetUserId: user.id,
          encryptedSessionKey,
          algorithm: "RSA-OAEP"
        }
      });
    }
  }

  async function loadRooms() {
    setLoadingRooms(true);
    setError("");

    try {
      const data = await apiRequest("/rooms", { token });
      setRooms(data.rooms || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function handleCreateInvite(form) {
    setCreatingInvite(true);
    setError("");

    try {
      const invite = await apiRequest("/invites", {
        method: "POST",
        token,
        body: form
      });

      await ensureCreatorEnvelope(invite.roomId);
      setInviteUrl(invite.inviteUrl);
      await loadRooms();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setCreatingInvite(false);
    }
  }

  if (!ready || !isAuthenticated) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <InviteModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setInviteUrl("");
        }}
        onCreate={handleCreateInvite}
        loading={creatingInvite}
        inviteUrl={inviteUrl}
      />

      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-6 rounded-[32px] border border-white/10 bg-slate-950/35 p-6 shadow-glow backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-teal-300">Dashboard</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">
              Welcome, <span className="gradient-text">{user.displayName}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Create a one-to-one room, attach a puzzle to the invite, and chat through client-side decrypted messages only.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-full bg-gradient-to-r from-orange-500 to-teal-400 px-5 py-3 font-semibold text-slate-950"
            >
              Create invite
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="rounded-full border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </header>

        {error ? <p className="mt-6 text-sm text-rose-300">{error}</p> : null}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loadingRooms ? (
            <div className="panel rounded-[30px] p-6 text-sm text-slate-300">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="panel rounded-[30px] p-8 text-sm text-slate-300 sm:col-span-2 xl:col-span-3">
              No rooms yet. Create your first invite to spin up a secure chat.
            </div>
          ) : (
            rooms.map((room) => {
              const partner = room.participants.find((participant) => participant.id !== user.id);

              return (
                <article key={room.roomId} className="panel rounded-[30px] p-6 transition hover:-translate-y-1 hover:border-orange-400/20">
                  <p className="text-xs uppercase tracking-[0.35em] text-orange-300">Room</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    {partner?.displayName || "Waiting for invitee"}
                  </h2>
                  <p className="mt-2 text-sm soft-text">
                    {partner?.email || "Share the invite link to let someone solve the puzzle and join."}
                  </p>
                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    <p className="font-medium text-slate-100">Latest encrypted payload</p>
                    <p className="mt-2 break-words">
                      {room.latestMessage?.encryptedContent || "No messages yet."}
                    </p>
                  </div>
                  <Link
                    href={`/chat/${room.roomId}`}
                    className="mt-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Open chat
                  </Link>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
