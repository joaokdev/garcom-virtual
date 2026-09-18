import { cn } from "@/lib/utils";

/**
 * Marca do produto Quizio — bolha "Q" arredondada com o rosto sorridente
 * do garçom virtual dentro, e um pequeno "rabo" de balão de fala fazendo
 * as vezes do traço do Q. Vetorial (SVG), então permanece nítida em
 * qualquer resolução/tamanho de tela — não é um raster reamostrado.
 *
 * Recriação vetorial simplificada da marca Quizio para uso em qualquer
 * tamanho (favicon, ícones de app, cabeçalhos). Para a versão ilustrada
 * completa (com a redoma/cloche e vapor), veja LogoMarkFull.
 */
export function LogoMark({
  className,
  color = "currentColor",
  eyeColor = "#F5821F",
}: {
  className?: string;
  color?: string;
  eyeColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Anel do "Q" — bolha de fala */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={color}
        d="M24,14 A9,9 0 1,0 6,14 A9,9 0 1,0 24,14 Z
           M20.6,14 A5.6,5.6 0 1,1 9.4,14 A5.6,5.6 0 1,1 20.6,14 Z"
      />
      {/* Rabo do Q / ponta do balão de fala */}
      <path fill={color} d="M23,17.8 L27.2,22 L23,26.2 L18.8,22 Z" />
      {/* Olhos sorridentes */}
      <path
        d="M10.2,14.5 Q12,11.8 13.8,14.5"
        stroke={eyeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.2,14.5 Q18,11.8 19.8,14.5"
        stroke={eyeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Versão ilustrada completa da marca — inclui a redoma (cloche) com vapor,
 * como na peça de identidade visual fornecida. Uso reservado a contextos
 * de destaque (hero de login, tela de splash), onde há espaço para o
 * detalhe extra. Em tamanhos pequenos, prefira LogoMark.
 */
export function LogoMarkFull({
  className,
  color = "currentColor",
  accent = "#F5821F",
  eyeColor = "#F5821F",
}: {
  className?: string;
  color?: string;
  accent?: string;
  eyeColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 56 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Vapor */}
      <path
        d="M9,10.5 C7.6,9 8.6,7.6 8,6 C7.6,5 8,4 9,3.3"
        stroke={accent}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      {/* Redoma / cloche servida pela mão */}
      <path
        fill={accent}
        d="M2,17.5 C2,12 5.5,8.6 10,8.6 C14.5,8.6 18,12 18,17.5 Z"
      />
      <rect x="1" y="17.5" width="18" height="2.2" rx="1.1" fill={accent} />
      <path
        fill={color}
        opacity="0.9"
        d="M1.2,19.7 C-0.6,21.6 -0.2,24.4 2.2,25.6 L6.4,27.6 C7.4,28.1 8.5,27.3 8.4,26.2 L8,21.7 Z"
      />
      {/* Anel do "Q" — bolha de fala */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={color}
        d="M43,14 A9,9 0 1,0 25,14 A9,9 0 1,0 43,14 Z
           M39.6,14 A5.6,5.6 0 1,1 28.4,14 A5.6,5.6 0 1,1 39.6,14 Z"
      />
      <path fill={color} d="M42,17.8 L46.2,22 L42,26.2 L37.8,22 Z" />
      <path
        d="M29.2,14.5 Q31,11.8 32.8,14.5"
        stroke={eyeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M35.2,14.5 Q37,11.8 38.8,14.5"
        stroke={eyeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
