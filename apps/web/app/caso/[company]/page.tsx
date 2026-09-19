import { notFound } from "next/navigation";
import { CompanyBoat } from "@/components/CompanyBoat";

export function generateStaticParams() { return [{company:"a"},{company:"b"}]; }
export const dynamicParams = false;

export default async function CompanySlide({params}:{params:Promise<{company:string}>}) {
  const {company}=await params;
  if(company!=="a"&&company!=="b")notFound();
  return <main data-company-slide={company} style={{minHeight:"100svh",background:"#fff",color:"#050b2c",padding:"clamp(36px,7vh,80px) 6vw 130px"}}>
    <h1 style={{fontFamily:"Manrope, sans-serif",fontSize:"clamp(32px,4vw,56px)",fontWeight:500,letterSpacing:"-.04em",margin:0}}>Empresa {company.toUpperCase()}</h1>
    <CompanyBoat company={company}/>
  </main>;
}
