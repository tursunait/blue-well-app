import * as React from "react";
import { cn } from "../lib/utils";

// BlueWell Timeline - Next 6 hours schedule
export interface TimelineEvent {
  id: string;
  label: string;
  time: string;
  color?: "green" | "blue" | "purple" | "orange";
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ events, className }) => {
  const colorClasses = {
    green: "bg-green-500 text-white",
    blue: "bg-bluewell-light text-white",
    purple: "bg-purple-500 text-white",
    orange: "bg-orange-500 text-white",
  };

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => {
    const timeA = parseTime(a.time);
    const timeB = parseTime(b.time);
    return timeA - timeB;
  });

  // Get unique times for the timeline
  const times = Array.from(new Set(sortedEvents.map((e) => e.time))).sort((a, b) => {
    return parseTime(a) - parseTime(b);
  });

  function parseTime(timeStr: string): number {
    // Parse time string like "7:00 PM" or "7 PM" to minutes since midnight
    const match = timeStr.match(/(\d+):?(\d+)?\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-base font-semibold text-neutral-dark">Next 6 hours</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-neutral-border" />
        
        {/* Time markers */}
        <div className="relative flex justify-between items-start pb-8">
          {times.map((time, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-neutral-border mb-2" />
              <span className="text-xs text-neutral-muted whitespace-nowrap">{time}</span>
            </div>
          ))}
        </div>

        {/* Event labels */}
        <div className="relative mt-4">
          {sortedEvents.map((event) => (
            <div
              key={event.id}
              className="absolute"
              style={{
                left: `${((parseTime(event.time) - parseTime(times[0])) / (parseTime(times[times.length - 1]) - parseTime(times[0]))) * 100}%`,
                transform: "translateX(-50%)",
                top: "-2rem",
              }}
            >
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                  colorClasses[event.color || "blue"]
                )}
              >
                {event.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

