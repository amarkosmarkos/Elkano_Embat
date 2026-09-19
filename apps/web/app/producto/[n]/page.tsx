import { notFound } from "next/navigation";
import { StoryPlaceholder } from "@/components/StoryPlaceholder";
const products=[
  {title:"Colocación de excedentes",demo:"Demo de colocación de excedentes",href:"/empresa/COMP_0054/"},
  {title:"Cash pooling automático",demo:"Demo de cash pooling",href:"/grupo/GROUP_0067/"},
  {title:"Monitor",demo:"Demo del monitor",href:"/monitor/"},
];
export function generateStaticParams(){return [1,2,3].map(n=>({n:String(n)}));}
export const dynamicParams=false;
export default async function ProductPage({params}:{params:Promise<{n:string}>}){
  const {n}=await params;const id=Number(n);if(!Number.isInteger(id)||id<1||id>3)notFound();const p=products[id-1];
  return <StoryPlaceholder path={`/producto/${id}`} title={p.title} section={`0${id+4}`} slots={["Qué problema resuelve y cómo se apoya en el score",p.demo,"Quién paga y por qué"]} links={[{label:"Abrir la demo existente",href:p.href}]}/>;
}
