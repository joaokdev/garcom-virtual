import { MapPinOff } from "lucide-react";

export function InvalidTableScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper text-ink-faint shadow-lift">
        <MapPinOff className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h1 className="font-display text-xl font-semibold text-ink">Quizio</h1>
      <p className="max-w-sm text-sm text-ink-soft">{message}</p>
    </div>
  );
}
