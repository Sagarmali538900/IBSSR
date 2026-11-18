const shapes = {
  overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="4" rx="1.5" /><rect x="13.5" y="9.5" width="7" height="11" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  assessments: <><path d="M8 4.5h8M8 3h8a2 2 0 0 1 2 2v15H6V5a2 2 0 0 1 2-2Z" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
  assignments: <><path d="M8 4h8M8 3h8a2 2 0 0 1 2 2v16H6V5a2 2 0 0 1 2-2Z" /><path d="m9 13 2 2 4-4" /></>,
  results: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 6-7" /><path d="M16 6h4v4" /></>,
  partners: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M16 5.5a3 3 0 0 1 0 5.8M17 14h.5a4 4 0 0 1 4 4v2" /></>,
  storage: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3 1.5 0 2.9-.2 4.1-.5M4 12v7c0 1.7 3.6 3 8 3 1.5 0 2.9-.2 4.1-.5V17" /><path d="M20 13v7M17 16.5h6" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  mailOpen: <><path d="M3 8.5 12 14l9-5.5" /><path d="M5 6h14a2 2 0 0 1 2 2v10H3V8a2 2 0 0 1 2-2Z" /><path d="m3 18 6-5m12 5-6-5" /></>,
  cloud: <><path d="M20 16.2A4.5 4.5 0 0 0 18.5 7.4 6.5 6.5 0 0 0 6 8.8 4 4 0 0 0 6 17h13" /><path d="M12 12v8m-3-3 3 3 3-3" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3" /></>,
  collapse: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M14 9l-2 3 2 3" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  login: <><path d="M14 8l4 4-4 4M18 12H4" /><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  upload: <><path d="M12 15V3m0 0L8 7m4-4 4 4M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></>,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></>,
  edit: <><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 14h11l1-14M9 7V4h6v3" /></>,
  open: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  moon: <><path d="M20.8 14.2A8.5 8.5 0 0 1 9.8 3.2 8.5 8.5 0 1 0 20.8 14.2Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  back: <><path d="m15 18-6-6 6-6" /><path d="M20 12H9" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chevronRight: <><path d="m9 18 6-6-6-6" /></>,
  alert: <><path d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, className, ...props }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {shapes[name] || shapes.file}
    </svg>
  );
}
