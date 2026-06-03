"use client";
import { useEffect } from "react";
import s from "./landing.module.css";

export default function LandingReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("." + s.reveal));
    els.forEach((e) => {
      if (e.getBoundingClientRect().top < window.innerHeight * 0.92)
        e.classList.add(s.in);
    });
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add(s.in));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { (en.target as HTMLElement).classList.add(s.in); io.unobserve(en.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((e) => { if (!e.classList.contains(s.in)) io.observe(e); });
    const t = setTimeout(() => els.forEach((e) => e.classList.add(s.in)), 1600);
    return () => { clearTimeout(t); io.disconnect(); };
  }, []);
  return null;
}
