import type { SVGProps } from "react";

export type FormaIconName =
  | "readiness"
  | "adaptive"
  | "privacy"
  | "training"
  | "plan"
  | "record"
  | "profile"
  | "arrow"
  | "play";

type Props = SVGProps<SVGSVGElement> & { name: FormaIconName };

const paths: Record<FormaIconName, React.ReactNode> = {
  readiness: <><path d="M5 17.5c2.2-5.3 4.6-8 7-8s4.8 2.7 7 8"/><path d="M12 4v3"/><path d="m6.4 6.4 2 2"/><path d="m17.6 6.4-2 2"/><circle cx="12" cy="17" r="1.5"/></>,
  adaptive: <><path d="M4 12a8 8 0 0 1 13.7-5.6"/><path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="m17 3.5.7 2.9-2.9.7"/><path d="m7 20.5-.7-2.9 2.9-.7"/><circle cx="12" cy="12" r="2.2"/></>,
  privacy: <><path d="M12 3.5 19 6v5.2c0 4.5-2.7 7.6-7 9.3-4.3-1.7-7-4.8-7-9.3V6l7-2.5Z"/><path d="m9.2 12 1.8 1.8 3.9-4"/></>,
  training: <><path d="M5 9v6M8 7v10M16 7v10M19 9v6M8 12h8"/></>,
  plan: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 4v4.8M20 12h-4.8"/></>,
  record: <><path d="M4 18V9M10 18V5M16 18v-7M22 18H2"/><path d="m4 7 6-4 6 6 5-4"/></>,
  profile: <><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.8-4.1 3-6.2 6.5-6.2s5.7 2.1 6.5 6.2"/></>,
  arrow: <><path d="M5 12h13"/><path d="m14 7 5 5-5 5"/></>,
  play: <path d="m9 7 8 5-8 5V7Z"/>,
};

export default function FormaIcon({ name, ...props }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
