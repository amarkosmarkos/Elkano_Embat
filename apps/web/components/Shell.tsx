"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/Nav";
import { PresentationNav } from "@/components/PresentationNav";

/** Envuelve las páginas con la barra y el ancho de lectura, salvo la intro del barco, que va a pantalla completa. */
export function Shell({
  companyId,
  groupId,
  monthLast,
  footer,
  children,
}: {
  companyId: string;
  groupId: string;
  monthLast: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const path = usePathname() ?? "/";
  if (/^\/(intro|escena|cierre)(\/|$)/.test(path)) return <>{children}<PresentationNav /></>;
  return (
    <>
      <Nav companyId={companyId} groupId={groupId} monthLast={monthLast} />
      <main className="mx-auto max-w-[1240px] px-6 py-6 pb-20">{children}</main>
      <PresentationNav />
      <footer className="mx-auto max-w-[1240px] px-6 py-6 text-[11px] text-ink-3">{footer}</footer>
    </>
  );
}
