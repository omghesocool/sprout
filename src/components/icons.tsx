import type { SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const HeartIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.4 1.1 4 2.2h4C14.6 6.1 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" />
  </Icon>
);
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon strokeWidth="3" {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const UndoIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 010 12h-3" />
  </Icon>
);
export const TuneIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Icon>
);
export const GridIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </Icon>
);
export const ListIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M10 6h10M10 12h10M10 18h10M4 5.5l1.5-1v4M4 15h2.5L4 18h3" />
  </Icon>
);
export const SettingsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </Icon>
);
export const GripIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    {[8, 12, 16].flatMap((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" />))}
  </Icon>
);
