function formatTime(dateValue) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(dateValue));
}

function AttachmentPreview({ message }) {
  if (!message.attachment || !message.attachmentObjectUrl) {
    return null;
  }

  const { kind, fileName, mimeType } = message.attachment;

  if (kind === "image") {
    return (
      <a href={message.attachmentObjectUrl} download={fileName} className="mt-3 block overflow-hidden rounded-2xl">
        <img src={message.attachmentObjectUrl} alt={fileName} className="max-h-72 w-full object-cover" />
      </a>
    );
  }

  if (kind === "video") {
    return (
      <video controls className="mt-3 max-h-72 w-full rounded-2xl" src={message.attachmentObjectUrl}>
        <track kind="captions" />
      </video>
    );
  }

  if (kind === "audio") {
    return <audio controls className="mt-3 w-full" src={message.attachmentObjectUrl} />;
  }

  return (
    <a
      href={message.attachmentObjectUrl}
      download={fileName}
      className="mt-3 block rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm"
    >
      Download {fileName}
      <span className="ml-2 opacity-70">{mimeType}</span>
    </a>
  );
}

export default function ChatWindow({
  messages,
  currentUserId,
  partner,
  typingLabel,
  presenceLabel,
  onSend,
  onTyping,
  onAttachmentSelect,
  selectedAttachmentName,
  banner,
  sending
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="panel rounded-[30px] p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Room status</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{partner?.displayName || "Waiting for partner"}</h2>
        <p className="mt-2 text-sm soft-text">{partner?.email || "Invite someone into the room to start chatting."}</p>
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-slate-100">Presence</p>
          <p className="mt-2 text-sm text-slate-300">{presenceLabel}</p>
        </div>
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-slate-100">Typing</p>
          <p className="mt-2 text-sm text-slate-300">{typingLabel || "No one is typing right now."}</p>
        </div>
      </aside>

      <section className="panel flex min-h-[70vh] flex-col rounded-[30px] p-4 sm:p-6">
        {banner ? (
          <div className="mb-4 rounded-3xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
            {banner}
          </div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto px-1 pb-4">
          {messages.map((message) => {
            const isCurrentUser = message.sender === currentUserId;

            return (
              <article
                key={message.id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[82%] rounded-[28px] px-4 py-3 shadow-lg",
                    isCurrentUser
                      ? "bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950"
                      : "border border-white/10 bg-slate-950/40 text-slate-100"
                  ].join(" ")}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                    {isCurrentUser ? "You" : message.senderDisplayName || partner?.displayName || "Partner"}
                  </p>
                  {message.plainText ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.plainText}</p>
                  ) : null}
                  {message.attachment ? (
                    <div className="mt-2 text-sm opacity-85">
                      <p>{message.attachment.fileName}</p>
                      <AttachmentPreview message={message} />
                    </div>
                  ) : null}
                  <p className="mt-2 text-right text-[11px] opacity-70">{formatTime(message.createdAt)}</p>
                </div>
              </article>
            );
          })}
        </div>

        <form onSubmit={onSend} className="mt-4 flex flex-col gap-3">
          {selectedAttachmentName ? (
            <div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 px-4 py-3 text-sm text-teal-100">
              Ready to send: {selectedAttachmentName}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              name="message"
              rows="2"
              onChange={onTyping}
              className="min-h-[58px] flex-1 rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3 text-slate-100 outline-none transition focus:border-teal-300"
              placeholder="Write something encrypted or attach a file..."
            />
            <label className="cursor-pointer rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">
              Attach
              <input
                type="file"
                name="attachment"
                onChange={onAttachmentSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar,.csv,.json"
              />
            </label>
            <button
              type="submit"
              disabled={sending}
              className="rounded-[24px] bg-gradient-to-r from-teal-400 to-orange-400 px-6 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
