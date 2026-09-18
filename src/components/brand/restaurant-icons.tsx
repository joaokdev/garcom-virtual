/**
 * Biblioteca de ícones de marca para restaurantes — silhuetas geométricas
 * desenhadas à mão, no mesmo espírito do LogoMark do produto: simples,
 * confiantes, legíveis em tamanho pequeno. Cada restaurante escolhe um
 * "logoIcon" (chave abaixo); se não houver correspondência, o componente
 * RestaurantMark recorre ao monograma tipográfico.
 *
 * No futuro módulo Admin, o restaurante poderia escolher entre esta
 * biblioteca ou enviar sua própria marca.
 */
import type { SVGProps } from "react";

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

/** Chama estilizada — usada por conceitos de churrasco, grelha, fogo. */
const FlameIcon: IconComponent = (props) => (
  <svg viewBox="0 0 32 32" fill="none" {...props}>
    <path
      fill="currentColor"
      d="M16,3 C10,9 7,14.5 7,19.5 C7,25 11,29.5 16,29.5 C21,29.5 25,25 25,19.5
         C25,15 21.5,11 18.5,8 C19,12.5 17.5,16 14.8,16 C12.5,16 11.3,13.8 12.5,11
         C13.6,8.4 15.6,5.3 16,3 Z"
    />
  </svg>
);

/** Folha estilizada — usada por conceitos saudáveis, vegetais, naturais. */
const LeafIcon: IconComponent = (props) => (
  <svg viewBox="0 0 32 32" fill="none" {...props}>
    <path
      fill="currentColor"
      d="M7.5,24 C4.5,16.5 7,7.5 16.5,4.8 C23.5,2.8 27.5,7 25.8,13
         C23.5,21 14,27.5 7.5,24 Z"
    />
    <path
      d="M9,21.5 C14,16 18.5,11.5 24,7.5"
      stroke="var(--color-paper, #FEFCFA)"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.55"
    />
  </svg>
);

/** Grão de café — para conceitos de cafeteria. */
const CoffeeBeanIcon: IconComponent = (props) => (
  <svg viewBox="0 0 32 32" fill="none" {...props}>
    <path
      fill="currentColor"
      d="M16,4 C9,4 4,10 4,17 C4,24 9,28 16,28 C23,28 28,24 28,17 C28,10 23,4 16,4 Z"
    />
    <path
      d="M16,6 C12,10 11,14 13,17 C11,20 12,24 16,26"
      stroke="var(--color-paper, #FEFCFA)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/** Peixe estilizado — para conceitos de frutos do mar. */
const FishIcon: IconComponent = (props) => (
  <svg viewBox="0 0 32 32" fill="none" {...props}>
    <path
      fill="currentColor"
      d="M5,17 C9,10 17,7 23,10 L27,6 L26,13 L29,15 L26,17 L27,24 L23,20
         C17,23 9,20 5,17 Z"
    />
  </svg>
);

/** Trigo/pão estilizado — para conceitos de padaria. */
const WheatIcon: IconComponent = (props) => (
  <svg viewBox="0 0 32 32" fill="none" {...props}>
    <path
      d="M16,28 L16,8"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {[10, 14, 18, 22].map((y) => (
      <g key={y}>
        <path d={`M16,${y} C13,${y - 2} 10,${y - 1} 9,${y - 4}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d={`M16,${y} C19,${y - 2} 22,${y - 1} 23,${y - 4}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    ))}
  </svg>
);

export const RESTAURANT_ICONS: Record<string, IconComponent> = {
  flame: FlameIcon,
  leaf: LeafIcon,
  coffee: CoffeeBeanIcon,
  fish: FishIcon,
  wheat: WheatIcon,
};

export type RestaurantIconKey = keyof typeof RESTAURANT_ICONS;
