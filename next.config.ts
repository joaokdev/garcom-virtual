import type { NextConfig } from "next";

const securityHeaders = [
  // Impede que o navegador "adivinhe" o tipo de um arquivo — mitiga ataques
  // de MIME-sniffing (ex.: um upload malicioso sendo interpretado como script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Bloqueia a aplicação de ser embutida em <iframe> de outros sites — mitiga clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Não vaza a URL completa (com tokens/ids) como Referer ao navegar para fora do site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desliga por padrão APIs de navegador sensíveis que a aplicação não usa.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: instrui o navegador a só falar HTTPS com este domínio daqui pra frente.
  // Inofensivo em dev (servido por HTTP) — o navegador ignora o header nesse caso.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    // Content-Security-Policy — a defesa mais forte contra script malicioso
    // injetado (XSS): mesmo que algum script consiga rodar na página, ele
    // não consegue carregar recursos nem "telefonar pra casa" (exfiltrar
    // dados) para nenhum domínio fora dos listados aqui.
    // Observação: 'unsafe-inline' em script-src é necessário porque o Next.js
    // App Router injeta os dados de hidratação em <script> inline; o
    // endurecimento completo (CSP por nonce) exigiria adicionar um
    // middleware.ts gerando um nonce por requisição — ver README.
    // 'unsafe-eval' SÓ em desenvolvimento: o HMR/overlay de erro do Next
    // (Turbopack/webpack) usa eval() pra reconstruir stack traces — sem isso
    // o dev server quebra com "eval() is not supported". Em produção o React
    // nunca chama eval(), então o build final continua sem essa permissão.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://images.unsplash.com",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

// Páginas e rotas que exibem dados de sessão (pedidos, valores, PIN protegido)
// nunca devem ficar em cache do navegador — evita que o botão "voltar" depois
// de um logout mostre uma tela antiga ainda com dados na memória do tablet.
const noStoreHeader = [{ key: "Cache-Control", value: "no-store, must-revalidate" }];

const nextConfig: NextConfig = {
  // Bolinha indicadora de atividade de build do Next.js (canto inferior
  // esquerdo, dev only) — não é um componente do app, mas incomodava na UI.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: noStoreHeader },
      { source: "/admin/:path*", headers: noStoreHeader },
      { source: "/cozinha/:path*", headers: noStoreHeader },
      { source: "/garcom/:path*", headers: noStoreHeader },
      { source: "/financeiro/:path*", headers: noStoreHeader },
      { source: "/r/:path*", headers: noStoreHeader },
      { source: "/hub", headers: noStoreHeader },
      { source: "/login", headers: noStoreHeader },
    ];
  },
};

export default nextConfig;
