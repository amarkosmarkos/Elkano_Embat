import { notFound } from "next/navigation";
import { ProductSlide } from "@/components/ContentSlides";
export function generateStaticParams(){return [1,2,3].map(n=>({n:String(n)}));}
export const dynamicParams=false;
export default async function ProductPage({params}:{params:Promise<{n:string}>}){
  const {n}=await params;const id=Number(n);if(!Number.isInteger(id)||id<1||id>3)notFound();
  return <ProductSlide number={id}/>;
}
