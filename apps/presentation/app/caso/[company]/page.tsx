import { notFound } from "next/navigation";
import { CaseSlide } from "@/components/ContentSlides";

export function generateStaticParams() { return [{company:"a"},{company:"b"}]; }
export const dynamicParams = false;

export default async function CompanySlide({params}:{params:Promise<{company:string}>}) {
  const {company}=await params;
  if(company!=="a"&&company!=="b")notFound();
  return <CaseSlide company={company}/>;
}
