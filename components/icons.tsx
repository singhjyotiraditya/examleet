"use client";
import React from "react";

interface IconProps { size?: number; style?: React.CSSProperties; className?: string; }

const I = ({ d, size = 20, sw = 1.75, fill = "none", children, style, className }: {
  d?: string; size?: number; sw?: number; fill?: string; children?: React.ReactNode;
  style?: React.CSSProperties; className?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
    {children || <path d={d} />}
  </svg>
);

export const Home = (p: IconProps) => <I {...p}><path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-4v-6h-8v6H4a1 1 0 0 1-1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" /><path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></I>;
export const Sets = (p: IconProps) => <I {...p}><rect x="3.5" y="4.5" width="17" height="4" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" /><rect x="3.5" y="11" width="17" height="4" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" /><rect x="3.5" y="17.5" width="11" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" /></I>;
export const Trophy = (p: IconProps) => <I {...p}><path d="M8 4h8v4.5a4 4 0 0 1-8 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M8 5.5H5.5a1.5 1.5 0 0 0 1.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 5.5h2.5a1.5 1.5 0 0 1-1.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 12.5V16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M8.5 19.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M9.5 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></I>;
export const Medal = (p: IconProps) => <I {...p}><circle cx="12" cy="14" r="5" /><path d="M9 9l-3-6" /><path d="M15 9l3-6" /></I>;
export const User = (p: IconProps) => <I {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></I>;
export const Flame = (p: IconProps) => <I {...p}><path d="M12 2c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4-1 3 1 5 3 5 0-3-1-6 0-10z" /></I>;
export const Search = (p: IconProps) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></I>;
export const Filter = (p: IconProps) => <I {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z" /></I>;
export const Sort = (p: IconProps) => <I {...p}><path d="M7 4v16" /><path d="M3 8l4-4 4 4" /><path d="M17 4v16" /><path d="M13 16l4 4 4-4" /></I>;
export const Bookmark = (p: IconProps) => <I {...p}><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z" /></I>;
export const BookmarkFill = (p: IconProps) => <I {...p} fill="currentColor"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z" /></I>;
export const Check = (p: IconProps) => <I {...p}><path d="M4 12l5 5L20 6" /></I>;
export const X = (p: IconProps) => <I {...p}><path d="M5 5l14 14" /><path d="M19 5L5 19" /></I>;
export const ArrowRight = (p: IconProps) => <I {...p}><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></I>;
export const ArrowLeft = (p: IconProps) => <I {...p}><path d="M19 12H5" /><path d="M11 5l-7 7 7 7" /></I>;
export const ArrowUp = (p: IconProps) => <I {...p}><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></I>;
export const ArrowDown = (p: IconProps) => <I {...p}><path d="M12 5v14" /><path d="M5 12l7 7 7-7" /></I>;
export const ChevronRight = (p: IconProps) => <I {...p}><path d="M9 6l6 6-6 6" /></I>;
export const ChevronDown = (p: IconProps) => <I {...p}><path d="M6 9l6 6 6-6" /></I>;
export const Bolt = (p: IconProps) => <I {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></I>;
export const Lightbulb = (p: IconProps) => <I {...p}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 1 4 10c-.7.6-1 1.5-1 2.4V16H9v-.6c0-.9-.3-1.8-1-2.4A6 6 0 0 1 12 3z" /></I>;
export const Book = (p: IconProps) => <I {...p}><path d="M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></I>;
export const Clock = (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>;
export const Calendar = (p: IconProps) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /></I>;
export const Users = (p: IconProps) => <I {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" /><circle cx="17" cy="9" r="3" /><path d="M22 19c0-2.5-2-4-5-4" /></I>;
export const Share = (p: IconProps) => <I {...p}><circle cx="6" cy="12" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M8.5 10.5L15.5 7" /><path d="M8.5 13.5L15.5 17" /></I>;
export const More = (p: IconProps) => <I {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></I>;
export const Settings = (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .7.5 1.3 1.51 1.51H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></I>;
export const Bell = (p: IconProps) => <I {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></I>;
export const Target = (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></I>;
export const Play = (p: IconProps) => <I {...p}><path d="M6 4v16l14-8z" fill="currentColor" stroke="currentColor" /></I>;
export const Pause = (p: IconProps) => <I {...p}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></I>;
export const Send = (p: IconProps) => <I {...p}><path d="M3 12l18-9-7 18-3-7z" /></I>;
export const Link = (p: IconProps) => <I {...p}><path d="M10 14a4 4 0 0 0 5 0l3-3a4 4 0 0 0-6-6l-1 1" /><path d="M14 10a4 4 0 0 0-5 0l-3 3a4 4 0 0 0 6 6l1-1" /></I>;
export const Zap = (p: IconProps) => <I {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" /></I>;
export const Globe = (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" /></I>;
export const Pin = (p: IconProps) => <I {...p}><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></I>;
export const Star = (p: IconProps) => <I {...p}><path d="M12 3l2.6 6 6.4.5-5 4.2 1.6 6.3L12 16.6 6.4 20l1.6-6.3-5-4.2L9.4 9z" /></I>;
export const TrendingUp = (p: IconProps) => <I {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></I>;
export const Edit = (p: IconProps) => <I {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></I>;
export const Refresh = (p: IconProps) => <I {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></I>;
export const Sparkle = (p: IconProps) => <I {...p}><path d="M12 3v6" /><path d="M12 15v6" /><path d="M3 12h6" /><path d="M15 12h6" /><path d="M6 6l3 3" /><path d="M15 15l3 3" /><path d="M18 6l-3 3" /><path d="M9 15l-3 3" /></I>;
export const Atom = (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="4" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" /></I>;
export const Leaf = (p: IconProps) => <I {...p}><path d="M11 20A7 7 0 0 1 4 13c0-6 5-10 16-10 0 8-3 17-9 17z" /><path d="M4 20l8-8" /></I>;
export const Eye = (p: IconProps) => <I {...p}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></I>;
export const Lock = (p: IconProps) => <I {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></I>;
export const Flag = (p: IconProps) => <I {...p}><path d="M4 21V4" /><path d="M4 4h11l-2 5 2 5H4" /></I>;
