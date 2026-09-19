import { useNavigate, useParams } from "react-router";
import { useApp } from "@/store/app";
import { CompanyPanel } from "@/components/CompanyPanel";

/** Deep-linkable company page: the same panel as the overlay. */
export function CompanyProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const setLender = useApp((s) => s.setLender);
  if (!id) return null;
  return <CompanyPanel id={id} onClose={() => nav(-1)} onLend={(lid) => { setLender(lid); nav("/borrowers"); }} />;
}
