import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

import ChatWindow from "../../components/ChatWindow";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { apiRequest } from "../../utils/api";
import {
  createRoomSessionKey,
  decryptAttachmentToObjectUrl,
  decryptRoomKeyEnvelope,
  decryptTextMessage,
  encryptAttachmentFile,
  encryptRoomKeyForPublicKey,
  encryptTextMessage,
  getStoredIdentity,
  getStoredRoomSessionKey,
  persistRoomSessionKey
} from "../../utils/crypto";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export default function ChatPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { ready, token, user, isAuthenticated } = useAuth();
  const socket = useSocket(token);
  const typingTimeoutRef = useRef(null);
  const sharedPartnerRef = useRef({});
  const [room, setRoom] = useState(null);
  const [encryptedMessages, setEncryptedMessages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [roomSessionKey, setRoomSessionKey] = useState(null);
  const [presence, setPresence] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [error, setError] = useState("");

  async function loadRoom() {
    if (!token || !roomId) {
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest(`/rooms/${roomId}`, { token });
      setRoom(data.room);
      setEncryptedMessages(data.messages || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    sharedPartnerRef.current = {};
  }, [roomId]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(router.asPath || "/dashboard")}`);
    }
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    loadRoom();
  }, [token, roomId]);

  useEffect(() => {
    if (!room || !user || !roomId) {
      return;
    }

    const identity = getStoredIdentity(user.email);

    if (!identity?.privateKey) {
      setError("Private key is missing on this device. Please sign in again on the same browser.");
      return;
    }

    let cancelled = false;

    async function resolveRoomKey() {
      try {
        let sessionKey = getStoredRoomSessionKey(roomId);

        if (!sessionKey && room.currentUserKeyEnvelope?.encryptedSessionKey) {
          sessionKey = await decryptRoomKeyEnvelope(
            room.currentUserKeyEnvelope.encryptedSessionKey,
            identity.privateKey
          );
          persistRoomSessionKey(roomId, sessionKey);
        }

        if (!sessionKey && room.createdBy?.id === user.id) {
          sessionKey = await createRoomSessionKey();
          persistRoomSessionKey(roomId, sessionKey);
          const encryptedSessionKey = await encryptRoomKeyForPublicKey(sessionKey, user.publicKey);
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

        if (!cancelled) {
          setRoomSessionKey(sessionKey || null);
        }

        if (!sessionKey && socket && room.createdBy?.id && room.createdBy.id !== user.id) {
          socket.emit("request_key_exchange", {
            roomId,
            targetUserId: room.createdBy.id
          });
        }
      } catch (keyError) {
        if (!cancelled) {
          setError(keyError.message);
        }
      }
    }

    resolveRoomKey();

    return () => {
      cancelled = true;
    };
  }, [room, roomId, socket, token, user]);

  useEffect(() => {
    if (!socket || !roomId || !user) {
      return undefined;
    }

    function joinRoom() {
      socket.emit("join_room", { roomId }, async (response) => {
        if (!response?.ok) {
          setError(response?.error || "Failed to join room");
          return;
        }

        const nextPresence = {};
        (response.statuses || []).forEach((entry) => {
          nextPresence[entry.userId] = entry.isOnline;
        });
        nextPresence[user.id] = true;
        setPresence(nextPresence);
        setError("");
        await loadRoom();
      });
    }

    function handleConnectError(connectError) {
      setError(connectError.message || "Socket connection failed");
    }

    function handleDisconnect() {
      setPresence((current) => ({
        ...current,
        [user.id]: false
      }));
    }

    socket.on("connect", joinRoom);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off("connect", joinRoom);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, roomId, token, user]);

  useEffect(() => {
    if (!socket || !room || !roomSessionKey || !user) {
      return;
    }

    const partner = room.participants?.find((participant) => participant.id !== user.id);

    if (!partner || !partner.publicKey) {
      return;
    }

    if (room.createdBy?.id !== user.id) {
      return;
    }

    if (sharedPartnerRef.current[partner.id]) {
      return;
    }

    sharedPartnerRef.current[partner.id] = true;

    async function shareRoomKeyWithPartner() {
      try {
        const encryptedSessionKey = await encryptRoomKeyForPublicKey(roomSessionKey, partner.publicKey);

        socket.emit(
          "share_session_key",
          {
            roomId,
            targetUserId: partner.id,
            encryptedSessionKey,
            algorithm: "RSA-OAEP"
          },
          (response) => {
            if (!response?.ok) {
              sharedPartnerRef.current[partner.id] = false;
              setError(response?.error || "Failed to share room key");
            }
          }
        );
      } catch (shareError) {
        sharedPartnerRef.current[partner.id] = false;
        setError(shareError.message);
      }
    }

    shareRoomKeyWithPartner();
  }, [socket, room, roomId, roomSessionKey, user]);

  useEffect(() => {
    if (!socket || !roomId || !user) {
      return undefined;
    }

    async function handleKeyRequest(payload) {
      if (payload.roomId !== roomId || payload.targetUserId !== user.id) {
        return;
      }

      const localRoomKey = getStoredRoomSessionKey(roomId);

      if (!localRoomKey) {
        return;
      }

      const encryptedSessionKey = await encryptRoomKeyForPublicKey(
        localRoomKey,
        payload.requesterPublicKey
      );

      socket.emit("share_session_key", {
        roomId,
        targetUserId: payload.requesterId,
        encryptedSessionKey,
        algorithm: "RSA-OAEP"
      });
    }

    async function handleSharedKey(payload) {
      if (payload.roomId !== roomId || payload.targetUserId !== user.id) {
        return;
      }

      const identity = getStoredIdentity(user.email);

      if (!identity?.privateKey) {
        return;
      }

      const sessionKey = await decryptRoomKeyEnvelope(payload.encryptedSessionKey, identity.privateKey);
      persistRoomSessionKey(roomId, sessionKey);
      setRoomSessionKey(sessionKey);
      setPresence((current) => ({
        ...current,
        [payload.sharedBy]: true
      }));
    }

    function handleMessage(message) {
      if (message.roomId !== roomId) {
        return;
      }

      setEncryptedMessages((current) => [...current, message]);
      setPresence((current) => ({
        ...current,
        [message.sender]: true
      }));
    }

    function handleTyping(payload) {
      if (payload.roomId !== roomId) {
        return;
      }

      setTypingUsers((current) => ({
        ...current,
        [payload.userId]: payload.isTyping
      }));
      setPresence((current) => ({
        ...current,
        [payload.userId]: true
      }));
    }

    async function handleStatus(payload) {
      if (payload.roomId !== roomId) {
        return;
      }

      setPresence((current) => ({
        ...current,
        [payload.userId]: payload.isOnline
      }));

      if (!room?.participants?.some((participant) => participant.id === payload.userId)) {
        await loadRoom();
      }
    }

    socket.on("receive_message", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("user_status", handleStatus);
    socket.on("key_exchange_requested", handleKeyRequest);
    socket.on("session_key_shared", handleSharedKey);

    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("typing", handleTyping);
      socket.off("user_status", handleStatus);
      socket.off("key_exchange_requested", handleKeyRequest);
      socket.off("session_key_shared", handleSharedKey);
    };
  }, [room, roomId, socket, user, token]);

  useEffect(() => {
    let cancelled = false;
    let previousUrls = [];

    async function hydrateMessages() {
      if (!roomSessionKey) {
        setMessages(
          encryptedMessages.map((message) => ({
            ...message,
            plainText:
              message.messageType === "text"
                ? "Encrypted message. Waiting for a usable room key on this device."
                : "",
            attachmentObjectUrl: null
          }))
        );
        return;
      }

      const nextMessages = await Promise.all(
        encryptedMessages.map(async (message) => {
          let plainText = "";
          let attachmentObjectUrl = null;

          if (message.messageType === "text" && message.encryptedContent && message.iv) {
            try {
              plainText = await decryptTextMessage(message, roomSessionKey);
            } catch (_error) {
              plainText = "Unable to decrypt this payload with the current key.";
            }
          }

          if (message.attachment?.url && message.iv) {
            try {
              attachmentObjectUrl = await decryptAttachmentToObjectUrl(message, roomSessionKey);
              if (attachmentObjectUrl) {
                previousUrls.push(attachmentObjectUrl);
              }
            } catch (_error) {
              plainText = plainText || "Unable to decrypt this attachment.";
            }
          }

          return {
            ...message,
            plainText,
            attachmentObjectUrl
          };
        })
      );

      if (!cancelled) {
        setMessages(nextMessages);
      }
    }

    hydrateMessages();

    return () => {
      cancelled = true;
      previousUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [encryptedMessages, roomSessionKey]);

  async function handleSend(event) {
    event.preventDefault();

    if (!socket || !roomId) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const plainText = String(formData.get("message") || "").trim();
    const attachment = selectedAttachment;

    if (!plainText && !attachment) {
      return;
    }

    if ((plainText && !roomSessionKey) || (attachment && !roomSessionKey)) {
      setError("A valid room key is required before sending content.");
      return;
    }

    setSending(true);
    setError("");

    try {
      if (attachment) {
        if (attachment.size > MAX_ATTACHMENT_SIZE) {
          throw new Error("Attachment must be 10 MB or smaller.");
        }

        const encryptedAttachment = await encryptAttachmentFile(attachment, roomSessionKey);
        await apiRequest(`/rooms/${roomId}/attachments`, {
          method: "POST",
          token,
          body: encryptedAttachment
        });
      }

      if (plainText) {
        const encryptedMessage = await encryptTextMessage(plainText, roomSessionKey);

        await new Promise((resolve, reject) => {
          socket.emit("send_message", { roomId, ...encryptedMessage }, (response) => {
            if (!response?.ok) {
              reject(new Error(response?.error || "Message failed to send"));
              return;
            }

            resolve(response.message);
          });
        });
      }

      socket.emit("typing", { roomId, isTyping: false });
      form.reset();
      setSelectedAttachment(null);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  function handleTyping() {
    if (!socket || !roomId) {
      return;
    }

    socket.emit("typing", { roomId, isTyping: true });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      socket.emit("typing", { roomId, isTyping: false });
    }, 1200);
  }

  function handleAttachmentSelect(event) {
    const nextFile = event.target.files?.[0] || null;
    setSelectedAttachment(nextFile);
  }

  if (!ready || !isAuthenticated) {
    return <div className="min-h-screen" />;
  }

  const partner = room?.participants?.find((participant) => participant.id !== user.id);
  const typingLabel = partner && typingUsers[partner.id] ? `${partner.displayName} is typing...` : "";
  const partnerOnline = partner ? Boolean(presence[partner.id]) : false;
  const presenceLabel = partner
    ? partnerOnline
      ? `${partner.displayName} is online`
      : `${partner.displayName} is offline`
    : "Waiting for someone to join this room.";
  const banner = typeof router.query.banner === "string" ? router.query.banner : "";

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-teal-300">Secure Room</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">{roomId}</h1>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-6xl">
        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        {loading ? (
          <div className="panel rounded-[30px] p-8 text-slate-100">Loading encrypted room...</div>
        ) : (
          <>
            {!roomSessionKey ? (
              <div className="mb-4 rounded-3xl border border-teal-400/20 bg-teal-400/10 px-4 py-3 text-sm text-teal-100">
                Waiting for a valid room key on this device. If you just joined, the creator needs to be online once to share the AES session key.
              </div>
            ) : null}
            <ChatWindow
              messages={messages}
              currentUserId={user.id}
              partner={partner}
              typingLabel={typingLabel}
              presenceLabel={presenceLabel}
              onSend={handleSend}
              onTyping={handleTyping}
              onAttachmentSelect={handleAttachmentSelect}
              selectedAttachmentName={selectedAttachment?.name || ""}
              banner={banner}
              sending={sending}
            />
          </>
        )}
      </div>
    </div>
  );
}


