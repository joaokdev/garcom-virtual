"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { LogoMark } from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/Button";
import { Signature } from "@/components/brand/Signature";
import { RESTAURANT_ICONS } from "@/components/brand/restaurant-icons";
import { cn } from "@/lib/utils";

const ICON_OPTIONS = [
  { key: "flame", label: "Chama" },
  { key: "leaf", label: "Folha" },
  { key: "coffee", label: "Café" },
  { key: "fish", label: "Peixe" },
  { key: "wheat", label: "Trigo" },
] as const;

type IconKey = (typeof ICON_OPTIONS)[number]["key"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function HubPage() {
  const router = useRouter();

  const [masterPin, setMasterPin] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#E05C2A");
  const [accentColor, setAccentColor] = useState("#1A4D3A");
  const [logoIcon, setLogoIcon] = useState<IconKey | null>(null);
  const [serviceFeePct, setServiceFeePct] = useState("10");
  const [kitchenPin, setKitchenPin] = useState("1234");
  const [financialPin, setFinancialPin] = useState("1234");
  const [adminPin, setAdminPin] = useState("1234");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string } | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) setSlug(slugify(value));
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterPin,
          name,
          slug,
          tagline,
          primaryColor,
          accentColor,
          logoIcon,
          serviceFeePct: parseFloat(serviceFeePct) || 0,
          kitchenPin,
          financialPin,
          adminPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar restaurante.");
        return;
      }
      setCreated({ slug: data.slug });
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Restaurante criado!</h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              O restaurante <strong>{name}</strong> está pronto com 4 mesas padrão e todos os painéis configurados.
            </p>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)] text-left">
            {[
              { label: "Cardápio (clientes)", href: `/m/${created.slug}/` },
              { label: "Gestão de Produtos", href: `/admin/${created.slug}` },
              { label: "Cozinha", href: `/cozinha/${created.slug}` },
              { label: "Garçom", href: `/garcom/${created.slug}` },
              { label: "Financeiro", href: `/financeiro/${created.slug}` },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="flex items-center justify-between border-b border-line px-5 py-3.5 last:border-0 hover:bg-stone transition"
              >
                <span className="text-sm font-medium text-ink">{label}</span>
                <ChevronRight className="h-4 w-4 text-ink-faint" />
              </a>
            ))}
          </div>

          <Button variant="secondary" size="md" fullWidth onClick={() => router.push("/")}>
            Voltar ao início
          </Button>
          <Signature />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone">
      <div className="mx-auto max-w-xl px-6 py-12 space-y-8">
        <div className="space-y-2 text-center">
          <LogoMark className="mx-auto h-7 w-7 text-ink-faint" />
          <h1 className="font-display text-2xl font-bold text-ink">Novo Restaurante</h1>
          <p className="text-sm text-ink-soft">
            Preencha as informações abaixo para criar um novo restaurante na plataforma Quizio.
          </p>
        </div>

        {error && (
          <div className="rounded-[var(--radius-lg)] bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Master PIN */}
          <Section title="Acesso">
            <Field label="Master PIN da plataforma">
              <input
                type="password"
                value={masterPin}
                onChange={(e) => setMasterPin(e.target.value)}
                placeholder="PIN de acesso ao hub"
                className={input()}
              />
              {process.env.NODE_ENV !== "production" && (
                <p className="text-xs text-ink-faint">Padrão de desenvolvimento: <code>comanda2025</code> (defina HUB_MASTER_PIN em produção)</p>
              )}
            </Field>
          </Section>

          {/* Identidade */}
          <Section title="Identidade">
            <Field label="Nome do restaurante">
              <input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex.: Sabor & Brasa" className={input()} />
            </Field>
            <Field label="Slug (URL)">
              <input
                value={slug}
                onChange={(e) => { setSlugManual(true); setSlug(slugify(e.target.value)); }}
                placeholder="sabor-brasa"
                className={cn(input(), "font-mono text-sm")}
              />
              <p className="text-xs text-ink-faint">Será usado em: /m/<strong>{slug || "slug"}</strong>/...</p>
            </Field>
            <Field label="Tagline (opcional)">
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Uma frase curta sobre o restaurante" className={input()} />
            </Field>
          </Section>

          {/* Visual */}
          <Section title="Identidade Visual">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cor principal">
                <div className="flex items-center gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-10 cursor-pointer rounded-[var(--radius-md)] border border-line bg-paper p-0.5" />
                  <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={cn(input(), "font-mono text-sm flex-1")} />
                </div>
              </Field>
              <Field label="Cor de destaque">
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-10 cursor-pointer rounded-[var(--radius-md)] border border-line bg-paper p-0.5" />
                  <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className={cn(input(), "font-mono text-sm flex-1")} />
                </div>
              </Field>
            </div>

            <Field label="Ícone de marca">
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(({ key, label }) => {
                  const Icon = RESTAURANT_ICONS[key]!;
                  const isSelected = logoIcon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLogoIcon(isSelected ? null : key)}
                      style={isSelected ? { background: primaryColor, color: "#fff" } : {}}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border px-4 py-3 transition active:scale-95",
                        isSelected ? "border-transparent" : "border-line bg-paper hover:border-ink-faint"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] font-semibold">{label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setLogoIcon(null)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border px-4 py-3 transition active:scale-95",
                    logoIcon === null ? "border-ink bg-stone" : "border-line bg-paper hover:border-ink-faint"
                  )}
                >
                  <span className="text-lg font-bold text-ink">{name.charAt(0).toUpperCase() || "A"}</span>
                  <span className="text-[11px] font-semibold text-ink-soft">Monograma</span>
                </button>
              </div>
            </Field>
          </Section>

          {/* Configurações */}
          <Section title="Configurações">
            <Field label="Taxa de serviço (%)">
              <input type="number" min="0" max="30" step="0.5" value={serviceFeePct} onChange={(e) => setServiceFeePct(e.target.value)} className={cn(input(), "font-mono w-32")} />
            </Field>
          </Section>

          {/* PINs */}
          <Section title="PINs de Acesso">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Cozinha / Garçom">
                <input type="password" value={kitchenPin} onChange={(e) => setKitchenPin(e.target.value)} maxLength={20} className={cn(input(), "font-mono text-center text-lg tracking-widest")} />
              </Field>
              <Field label="Financeiro">
                <input type="password" value={financialPin} onChange={(e) => setFinancialPin(e.target.value)} maxLength={20} className={cn(input(), "font-mono text-center text-lg tracking-widest")} />
              </Field>
              <Field label="Gestão">
                <input type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} maxLength={20} className={cn(input(), "font-mono text-center text-lg tracking-widest")} />
              </Field>
            </div>
          </Section>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={saving}
            disabled={!name.trim() || !slug.trim() || !masterPin.trim()}
            onClick={handleSubmit}
          >
            Criar restaurante
          </Button>

          <Signature />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)]">
      <div className="border-b border-line px-5 py-3.5">
        <h2 className="text-[12px] font-bold uppercase tracking-widest text-ink-faint">{title}</h2>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-ink">{label}</label>
      {children}
    </div>
  );
}

function input() {
  return "w-full rounded-[var(--radius-lg)] border border-line bg-stone px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none transition-colors";
}
