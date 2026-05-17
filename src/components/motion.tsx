
import * as React from "react";
import { useRef, useEffect } from "react";

export function ScrollReveal({ children, className, delay = 0 }: BaseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.62, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

const TRANSITIONS = {
  slow: { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const },
  medium: { duration: 0.46, ease: [0.22, 1, 0.36, 1] as const },
  fast: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

const VIEWPORT = { once: true, margin: "-80px" };

// Shared base variants keep motion rhythm consistent across marketing and app routes.
const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
};

const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
};

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

// ── Shared props ────────────────────────────────────────────────
interface BaseProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// ── FadeUp ──────────────────────────────────────────────────────
export function FadeUp({ children, className, delay = 0 }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={fadeUpVariants}
      transition={reduced ? { duration: 0 } : { ...TRANSITIONS.slow, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── FadeIn ──────────────────────────────────────────────────────
export function FadeIn({ children, className, delay = 0 }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={fadeInVariants}
      transition={reduced ? { duration: 0 } : { ...TRANSITIONS.medium, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── SlideInLeft ─────────────────────────────────────────────────
export function SlideInLeft({ children, className, delay = 0 }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={slideInLeftVariants}
      transition={reduced ? { duration: 0 } : { ...TRANSITIONS.slow, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── SlideInRight ────────────────────────────────────────────────
export function SlideInRight({ children, className, delay = 0 }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={slideInRightVariants}
      transition={reduced ? { duration: 0 } : { ...TRANSITIONS.slow, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerContainer ─────────────────────────────────────────────
export function StaggerContainer({ children, className }: Omit<BaseProps, "delay">) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerItem ──────────────────────────────────────────────────
export function StaggerItem({ children, className }: Omit<BaseProps, "delay">) {
  return (
    <motion.div
      variants={fadeUpVariants}
      transition={TRANSITIONS.slow}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className, delay = 0 }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={scaleInVariants}
      transition={reduced ? { duration: 0 } : { ...TRANSITIONS.medium, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealMask({ children, className, delay = 0 }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, clipPath: "inset(0 0 0% 0)" }}
      viewport={VIEWPORT}
      transition={reduced ? { duration: 0 } : { ...TRANSITIONS.slow, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Playful Bounce (for CTAs and interactive elements) ──────────
const bounceVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    }
  },
};

export function PlayfulBounce({ children, className, delay = 0 }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={bounceVariants}
      transition={reduced ? { duration: 0 } : { delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Tail Wag Loading (playful loading state) ────────────────────
export function TailWagLoading({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  
  if (reduced) {
    return <div className={className}>🐾</div>;
  }
  
  return (
    <motion.div
      animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "easeInOut",
      }}
      className={className}
    >
      🐾
    </motion.div>
  );
}

// ── Paw Print Appear (for badges and icons) ─────────────────────
const pawPrintVariants: Variants = {
  hidden: { opacity: 0, scale: 0, rotate: -45 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
    }
  },
};

export function PawPrintAppear({ children, className, delay = 0 }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={pawPrintVariants}
      transition={reduced ? { duration: 0 } : { delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
