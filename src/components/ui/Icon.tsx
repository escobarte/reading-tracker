import type { ReactElement, SVGProps } from "react";

export type IconName =
  | "home"
  | "library"
  | "start"
  | "notes"
  | "stats"
  | "settings"
  | "search"
  | "plus"
  | "close"
  | "back"
  | "chevron-down"
  | "pause"
  | "stop"
  | "camera"
  | "quote"
  | "favorite"
  | "check"
  | "more"
  | "drag"
  | "export";

type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill"> & {
  name: IconName;
};

const paths: Record<IconName, ReactElement> = {
  home: (
    <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
  ),
  library: (
    <path d="M4 4v16M9 4v16M9 4l6.5.9a1 1 0 0 1 .5 1.8V19a1 1 0 0 1-1.2 1L9 19" />
  ),
  start: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  notes: (
    <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm6 0v4.5a.5.5 0 0 0 .5.5H18M9 12h6M9 15.5h6M9 8.5h3" />
  ),
  stats: <path d="M5 20V10M12 20V4M19 20v-7" />,
  settings: (
    <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h12M20 17h0M8.5 4.5v5M14 9.5v5M6.5 14.5v5" />
  ),
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4.3-4.3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5 8 12l7 7" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  pause: <path d="M8 5v14M16 5v14" />,
  stop: <path d="M6 6h12v12H6z" />,
  camera: (
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
  ),
  quote: (
    <path d="M7 8.5A3.5 3.5 0 0 0 5 15c.3 2 1.8 3.5 1.8 3.5M15 8.5A3.5 3.5 0 0 0 13 15c.3 2 1.8 3.5 1.8 3.5" />
  ),
  favorite: (
    <path d="m12 5 2.1 4.6 5 .6-3.7 3.5.9 5-4.3-2.5-4.3 2.5.9-5-3.7-3.5 5-.6L12 5Z" />
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  more: (
    <path d="M5 12h.01M12 12h.01M19 12h.01" strokeLinecap="round" strokeWidth={3} />
  ),
  drag: (
    <path
      d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"
      strokeLinecap="round"
      strokeWidth={3}
    />
  ),
  export: <path d="M12 15V4M8 8l4-4 4 4M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />,
};

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
