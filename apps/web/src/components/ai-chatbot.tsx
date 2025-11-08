"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChatBubble, Button } from "@halo/ui";
import { chatRequest, addCalendarEvent } from "@/lib/api";
import { ChatMessage, Suggestion } from "@halo/types";
import { MessageCircle, X, Send } from "lucide-react";

interface AIChatbotProps {
  userProfile?: Record<string, any>;
}

export function AIChatbot({ userProfile }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user profile if not provided
  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await fetch("/api/profile");
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !userProfile,
  });

  const activeProfile = userProfile || profile;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const conversationHistory = messages
        .slice(-5)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      return chatRequest(message, undefined, conversationHistory, activeProfile || undefined);
    },
    onSuccess: (data, message) => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "Here are some suggestions:",
        suggestions: data.suggestions,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage, aiMessage]);
      setInput("");
    },
    onError: (error) => {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please make sure the API server is running on port 8000.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSuggestionAction = async (suggestion: Suggestion) => {
    if (suggestion.kind === "class" && suggestion.payload) {
      console.log("Reserve class:", suggestion);
    } else if (suggestion.kind === "workout" || suggestion.kind === "meal") {
      if (suggestion.payload?.startISO && suggestion.payload?.endISO) {
        try {
          await addCalendarEvent({
            title: suggestion.title,
            startISO: suggestion.payload.startISO,
            endISO: suggestion.payload.endISO,
            location: suggestion.payload.location,
            notes: suggestion.desc,
          });
        } catch (error) {
          console.error("Failed to add to calendar:", error);
        }
      }
    }
  };

  const quickReplies = ["What workout should I do?", "Suggest a meal", "Find a class", "What's my plan today?"];

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          console.log("Opening AI chatbot");
          setIsOpen(true);
        }}
        className="w-full p-4 rounded-xl bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white hover:from-bluewell-royal hover:to-bluewell-navy transition-all shadow-md hover:shadow-lg border-0"
      >
        <div className="flex items-center justify-center gap-3">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold">Ask AI Assistant</span>
        </div>
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-neutral-border bg-neutral-white shadow-soft overflow-hidden flex flex-col" style={{ height: "500px" }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-border bg-gradient-to-r from-bluewell-light to-bluewell-royal text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-bg">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
            <p className="text-base text-neutral-text">How can I help you today?</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => {
                    setInput(reply);
                    sendMessage.mutate(reply);
                  }}
                  className="px-3 py-2 rounded-lg bg-neutral-white border border-neutral-border text-sm text-neutral-text hover:border-accent-light hover:text-bluewell-royal transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                suggestions={msg.suggestions}
                timestamp={msg.timestamp}
                onSuggestionAction={handleSuggestionAction}
              />
            ))}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-neutral-white border border-neutral-border px-4 py-2">
                  <p className="text-sm text-neutral-muted">thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-border bg-neutral-white p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim() && !sendMessage.isPending) {
                sendMessage.mutate(input);
              }
            }}
            placeholder="Ask me anything..."
            className="flex-1 h-10 rounded-lg border border-neutral-border bg-neutral-white px-3 text-sm focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
            disabled={sendMessage.isPending}
          />
          <button
            onClick={() => {
              if (input.trim() && !sendMessage.isPending) {
                sendMessage.mutate(input);
              }
            }}
            disabled={!input.trim() || sendMessage.isPending}
            className="h-10 w-10 rounded-lg bg-bluewell-royal text-white hover:bg-bluewell-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

