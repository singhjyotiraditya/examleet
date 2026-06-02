 "use client";
 import React, { useEffect, useId, useMemo, useRef, useState } from "react";
 import { ChevronDown } from "./icons";
 
 export type ThemedSelectOption<T extends string> = {
   value: T;
   label: string;
 };
 
 export function ThemedSelect<T extends string>({
   value,
   options,
   onChange,
   ariaLabel,
 }: {
   value: T;
   options: readonly ThemedSelectOption<T>[];
   onChange: (v: T) => void;
   ariaLabel: string;
 }) {
   const listboxId = useId();
   const rootRef = useRef<HTMLDivElement>(null);
   const btnRef = useRef<HTMLButtonElement>(null);
 
   const [open, setOpen] = useState(false);
   const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex(o => o.value === value)));
 
   const selected = useMemo(() => options.find(o => o.value === value) ?? options[0], [options, value]);
 
   useEffect(() => {
     if (!open) return;
     const idx = options.findIndex(o => o.value === value);
     setActiveIndex(Math.max(0, idx));
   }, [open, options, value]);
 
   useEffect(() => {
     if (!open) return;
     const onPointerDown = (e: MouseEvent | TouchEvent) => {
       const el = rootRef.current;
       if (!el) return;
       if (e.target instanceof Node && !el.contains(e.target)) {
         setOpen(false);
       }
     };
     document.addEventListener("mousedown", onPointerDown);
     document.addEventListener("touchstart", onPointerDown, { passive: true });
     return () => {
       document.removeEventListener("mousedown", onPointerDown);
       document.removeEventListener("touchstart", onPointerDown);
     };
   }, [open]);
 
   const commit = (idx: number) => {
     const opt = options[idx];
     if (!opt) return;
     onChange(opt.value);
     setOpen(false);
     btnRef.current?.focus();
   };
 
   const onButtonKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === "ArrowDown" || e.key === "ArrowUp") {
       e.preventDefault();
       setOpen(true);
       return;
     }
     if (e.key === "Enter" || e.key === " ") {
       e.preventDefault();
       setOpen(v => !v);
       return;
     }
   };
 
   const onListboxKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === "Escape") {
       e.preventDefault();
       setOpen(false);
       btnRef.current?.focus();
       return;
     }
     if (e.key === "Enter" || e.key === " ") {
       e.preventDefault();
       commit(activeIndex);
       return;
     }
     if (e.key === "Home") {
       e.preventDefault();
       setActiveIndex(0);
       return;
     }
     if (e.key === "End") {
       e.preventDefault();
       setActiveIndex(options.length - 1);
       return;
     }
     if (e.key === "ArrowDown") {
       e.preventDefault();
       setActiveIndex(i => Math.min(options.length - 1, i + 1));
       return;
     }
     if (e.key === "ArrowUp") {
       e.preventDefault();
       setActiveIndex(i => Math.max(0, i - 1));
       return;
     }
   };
 
   return (
     <div ref={rootRef} className="tselect">
       <button
         ref={btnRef}
         type="button"
         className="tselect-btn"
         aria-label={ariaLabel}
         aria-haspopup="listbox"
         aria-expanded={open}
         aria-controls={listboxId}
         onClick={() => setOpen(v => !v)}
         onKeyDown={onButtonKeyDown}
       >
         <span className="tselect-value">{selected?.label ?? ""}</span>
         <span className={`tselect-caret${open ? " on" : ""}`} aria-hidden="true"><ChevronDown size={13} /></span>
       </button>
 
       {open && (
         <div
           id={listboxId}
           className="tselect-menu"
           role="listbox"
           tabIndex={-1}
           aria-label={ariaLabel}
           aria-activedescendant={`${listboxId}-${options[activeIndex]?.value ?? "x"}`}
           onKeyDown={onListboxKeyDown}
         >
           {options.map((o, idx) => {
             const isSelected = o.value === value;
             const isActive = idx === activeIndex;
             return (
               <button
                 key={o.value}
                 id={`${listboxId}-${o.value}`}
                 type="button"
                 role="option"
                 aria-selected={isSelected}
                 className={`tselect-item${isSelected ? " on" : ""}${isActive ? " active" : ""}`}
                 onMouseEnter={() => setActiveIndex(idx)}
                 onClick={() => commit(idx)}
               >
                 <span>{o.label}</span>
                 {isSelected && <span className="tselect-check" aria-hidden="true">✓</span>}
               </button>
             );
           })}
         </div>
       )}
     </div>
   );
 }
