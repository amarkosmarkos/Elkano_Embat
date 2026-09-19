import { notFound } from "next/navigation";
import { Escena } from "@/components/Escena";
import { getOverview } from "@/lib/data";
import { StoryPlaceholder } from "@/components/StoryPlaceholder";
export function generateStaticParams(){return [1,2,3,4,5,6,8].map(n=>({n:String(n)}));}
export const dynamicParams=false;
export default async function ScenePage({params}:{params:Promise<{n:string}>}){
  const {n}=await params;const number=Number(n);if(![1,2,3,4,5,6,8].includes(number))notFound();
  if(number===8)return <StoryPlaceholder path="/escena/8" title="Dos empresas que necesitan ayuda" section="08" hybrid slots={["Empresa A: diagnóstico y producto recomendado","Empresa B: diagnóstico y producto recomendado","Impacto en el conjunto del dataset"]} links={[{label:"Explorar empresas",href:"/score/"},{label:"Ver operaciones",href:"/operaciones/"}]}/>;
  return <Escena key={number} number={number} windows={getOverview().windows}/>;
}
