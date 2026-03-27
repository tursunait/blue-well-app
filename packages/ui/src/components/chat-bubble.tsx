import * as React from "react";
import { cn } from "../lib/utils";
import { Suggestion } from "@halo/types";
import { ActionCard } from "./action-card";

// BlueWell Chat Bubble - Soft, calm, minimal text
export interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
  timestamp?: string;
  onSuggestionAction?: (suggestion: Suggestion) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  content,
  suggestions,
  timestamp,
  onSuggestionAction,
}) => {
  const isUser = role === "user";

  // Format ISO timestamps into a more readable, locale-aware string
  const formattedTimestamp = (() => {
    if (!timestamp) return null;
    try {
      const d = new Date(timestamp);
      if (Number.isNaN(d.getTime())) return timestamp;
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(d);
    } catch (e) {
      return timestamp;
    }
  })();

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-3", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-5 py-3 text-base leading-relaxed",
            isUser
              ? "bg-bluewell-royal text-white"
              : "bg-neutral-white text-neutral-dark border border-neutral-border shadow-sm"
          )}
        >
          <p>{content}</p>
        </div>
        {suggestions && suggestions.length > 0 && !isUser && (
          <div className="space-y-2 w-full">
            {suggestions.map((suggestion) => (
              <ActionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAction={onSuggestionAction}
              />
            ))}
          </div>
        )}
        {formattedTimestamp && (
          <p className="text-xs text-neutral-muted px-1">{formattedTimestamp}</p>
        )}
      </div>
    </div>
  );
};
