import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Lenders } from "@/pages/Lenders";
import { CompanyProfile } from "@/pages/CompanyProfile";
import { Borrowers } from "@/pages/Borrowers";
import { Monitor } from "@/pages/Monitor";
import { ActionCenter } from "@/pages/ActionCenter";
import { useApp } from "@/store/app";

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="h-full min-h-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const loc = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={loc} key={loc.pathname}>
        <Route element={<AppShell />}>
          <Route index element={<Page><Lenders /></Page>} />
          <Route path="company/:id" element={<Page><CompanyProfile /></Page>} />
          <Route path="borrowers" element={<Page><Borrowers /></Page>} />
          <Route path="portfolio" element={<Navigate to="/borrowers" replace />} />
          <Route path="monitor" element={<Page><Monitor /></Page>} />
          <Route path="monitor/actions" element={<Page><ActionCenter /></Page>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const theme = useApp((s) => s.theme);
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
