"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function ElapsedTimer({
  since,
  warningMinutes = 10,
  dangerMinutes = 20,
  defaultColor,
  className,
}: {
  since: string;
  warningMinutes?: number;
  dangerMinutes?: number;
  defaultColor?: string;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(since).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [since]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const isWarning = minutes >= warningMinutes;
  const isDanger = minutes >= dangerMinutes;

  const color = isDanger ? "#F87171" : isWarning ? "#FBBF24" : defaultColor;

  return (
    <span
      className={cn(
        "flex items-center gap-1 font-mono text-xs font-bold tabular-nums",
        isDanger && "animate-pulse",
        className
      )}
      style={{ color }}
    >
      {isDanger ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}
