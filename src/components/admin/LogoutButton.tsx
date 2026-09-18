"use client";

export function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-[var(--radius-md)] border border-line px-3 py-2 text-xs font-semibold text-ink-soft transition hover:text-ink"
    >
      Sair
    </button>
  );
}
