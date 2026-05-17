"use client";

import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/hooks/useMessages";

const messageTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

function formatMessageTime(value: string | Date): string {
  return messageTimeFormatter.format(new Date(value));
}

interface MessageThreadProps {
  bookingId: string;
  bookingNumber: string;
}

export function MessageThread({ bookingId, bookingNumber }: MessageThreadProps) {
  const {
    messages,
    isLoading,
    isError,
    error,
    hasMore,
    sendMessage,
    isSending,
    loadMore,
  } = useMessages({
    bookingId,
    pollIntervalMs: 30000,
  });

  const [messageInput, setMessageInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const shouldAutoScrollRef = useRef(true);

  // Keep scrolling local to the message list so the page itself never jumps.
  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  useEffect(() => {
    const lastMessageId = messages[messages.length - 1]?.id ?? null;
    const isInitialLoad = prevLastMessageIdRef.current === null;
    const hasNewMessage =
      lastMessageId !== null && lastMessageId !== prevLastMessageIdRef.current;

    if ((isInitialLoad || hasNewMessage) && shouldAutoScrollRef.current) {
      scrollToBottom(isInitialLoad ? "auto" : "smooth");
    }

    prevLastMessageIdRef.current = lastMessageId;
  }, [messages]);

  const handleContainerScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= 48;
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    setSendError(null);
    shouldAutoScrollRef.current = true;
    const trimmedMessage = messageInput.trim();
    setMessageInput("");

    const result = await sendMessage(trimmedMessage);
    if (!result) {
      setSendError("Failed to send message. Please try again.");
      setMessageInput(trimmedMessage); // Restore input on error
    }
  };

  // Handle key press (Ctrl/Cmd + Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className="flex flex-col h-full max-h-[600px] bg-white border rounded-lg"
      role="region"
      aria-label="Message thread"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-sm">Booking #{bookingNumber}</h3>
        <p className="text-xs text-gray-600 mt-1">
          Staff communication for this booking
        </p>
      </div>

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onScroll={handleContainerScroll}
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {/* Loading state */}
        {isLoading && messages.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin text-2xl">💬</div>
            <p className="mt-2 text-sm text-gray-600">Loading messages...</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div
            className="p-3 bg-red-50 border border-red-200 rounded text-sm"
            role="alert"
          >
            <p className="text-red-800">
              Failed to load messages: {error?.message}
            </p>
          </div>
        )}

        {/* Load more button */}
        {hasMore && messages.length > 0 && (
          <div className="text-center">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
              aria-label="Load earlier messages"
            >
              {isLoading ? "Loading..." : "Load Earlier"}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <p className="text-sm">No messages yet. Start a conversation!</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          const isCustomer = msg.senderType === "customer";
          const sentTime = formatMessageTime(msg.sentAt);

          return (
            <div
              key={msg.id}
              className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
              role="article"
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  isCustomer
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {!isCustomer && (
                  <p className="text-xs font-medium mb-1 opacity-75">
                    {msg.senderName}
                  </p>
                )}
                <p className="text-sm break-words">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    isCustomer ? "text-blue-100" : "text-gray-600"
                  }`}
                >
                  {sentTime}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input area */}
      <div className="border-t p-4 bg-gray-50 space-y-2">
        {sendError && (
          <div
            className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800"
            role="alert"
          >
            {sendError}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Ctrl+Enter to send)"
            disabled={isSending}
            className="flex-1 px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            rows={3}
            aria-label="Message input"
            maxLength={5000}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {messageInput.length}/5000
          </p>
          <button
            onClick={handleSendMessage}
            disabled={isSending || !messageInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
