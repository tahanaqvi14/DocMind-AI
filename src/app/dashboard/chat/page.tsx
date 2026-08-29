import { ChatWindow } from "@/components/ChatWindow";

export default function ChatPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-medium">Chat</h1>
      <p className="mt-1 text-ink-muted">
        Ask anything about the documents you&apos;ve uploaded.
      </p>
      <div className="mt-6">
        <ChatWindow />
      </div>
    </div>
  );
}
