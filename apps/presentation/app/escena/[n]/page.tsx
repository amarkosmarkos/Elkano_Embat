import { notFound } from "next/navigation";
import { Escena } from "@/components/Escena";
import { getOverview } from "@/lib/data";
export function generateStaticParams(){return [1,2,3,4,5,6,8].map(n=>({n:String(n)}));}
export const dynamicParams=false;
export default async function ScenePage({params}:{params:Promise<{n:string}>}){
  const {n}=await params;const number=Number(n);if(![1,2,3,4,5,6,8].includes(number))notFound();
  return <Escena key={number} number={number} windows={getOverview().windows}/>;
}
