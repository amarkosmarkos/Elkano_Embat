import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

interface Props {
  value: number;
  digits?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  format?: (v: number) => string;
}

export function AnimatedNumber({ value, digits = 0, prefix = "", suffix = "", className, duration = 1.1, format }: Props) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `${prefix}${format ? format(v) : v.toFixed(digits)}${suffix}`);
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, mv, duration]);
  return <motion.span className={`tnum ${className ?? ""}`}>{text}</motion.span>;
}
