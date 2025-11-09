"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChatBubble, Button } from "@halo/ui";
import { chatRequest, addCalendarEvent } from "@/lib/api";
import { ChatMessage, Suggestion } from "@halo/types";

// BlueWell Chat - Soft bubbles, big action cards, minimal text
export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  // Fetch persona & survey context for personalization
  const { data: personaData } = useQuery({
    queryKey: ["chatPersona"],
    queryFn: async () => {
      const response = await fetch("/api/chat/profile");
      if (!response.ok) return null;
      return response.json();
    },
  });

  const persona = personaData?.persona;
  const personaContext = persona
    ? {
        targets: {
          calorieBudget: persona.calorieBudget,
          proteinTarget: persona.proteinTarget,
        },
        surveyAnswers: personaData?.surveyAnswers || [],
      }
    : undefined;

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      // Get last 5 messages for conversation history
      const conversationHistory = messages
        .slice(-5)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      return chatRequest(message, personaContext, conversationHistory, persona || undefined);
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

  const quickReplies = [
    "What workout should I do?",
    "Suggest a meal",
    "Find a class",
    "What's my plan today?",
  ];

  return (
    <div className="flex h-screen flex-col bg-neutral-bg pb-24">
      {/* Header - Minimal */}
      <div className="border-b border-neutral-border bg-neutral-white px-6 py-4">
        <h1 className="text-xl font-semibold text-neutral-dark">chat</h1>
      </div>

      {/* Messages - Soft, calm */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
            <p className="text-lg text-neutral-text">how can i help you today?</p>
            <div className="flex flex-wrap gap-3 justify-center max-w-md">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => {
                    setInput(reply);
                    sendMessage.mutate(reply);
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-white border border-neutral-border text-sm text-neutral-text hover:border-accent-light hover:text-bluewell-royal transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              suggestions={msg.suggestions}
              timestamp={msg.timestamp}
              onSuggestionAction={handleSuggestionAction}
            />
          ))
        )}
        {sendMessage.isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-neutral-white border border-neutral-border px-5 py-3">
              <p className="text-base text-neutral-muted">thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input - Big, clear */}
      <div className="border-t border-neutral-border bg-neutral-white px-6 py-4">
        <div className="flex gap-3 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim() && !sendMessage.isPending) {
                sendMessage.mutate(input);
              }
            }}
            placeholder="type your message..."
            className="flex-1 h-14 rounded-xl border-2 border-neutral-border bg-neutral-white px-5 text-base focus:border-accent-light focus:outline-none focus:ring-2 focus:ring-accent-light/20 transition-colors"
            disabled={sendMessage.isPending}
          />
          <Button
            onClick={() => {
              if (input.trim() && !sendMessage.isPending) {
                sendMessage.mutate(input);
              }
            }}
            disabled={!input.trim() || sendMessage.isPending}
            size="lg"
          >
            send
          </Button>
        </div>
      </div>
    </div>
  );
}
