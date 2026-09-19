import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useApp } from "@/store/app";
import { CompanyPanel } from "./CompanyPanel";

/** Full-area overlay with the company panel — opened from any card, tile or list without leaving the screen. */
export function CompanyOverlay() {
  const id = useApp((s) => s.openCompany);
  const setOpen = useApp((s) => s.setOpenCompany);
  const setLender = useApp((s) => s.setLender);
  const nav = useNavigate();
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, setOpen]);
  return (
    <AnimatePresence>
      {id && (
        <motion.div className="absolute inset-0 z-50 flex flex-col bg-[#0e0906]/80 p-3 md:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOpen(null)}>
          <motion.div className="h-full min-h-0" initial={{ y: 14, scale: 0.985 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: 0.985 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} onClick={(e) => e.stopPropagation()}>
            <CompanyPanel id={id} onClose={() => setOpen(null)} onLend={(lid) => { setLender(lid); setOpen(null); nav("/borrowers"); }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
