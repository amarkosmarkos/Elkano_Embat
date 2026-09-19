import { Escena } from "@/components/Escena";
import { getOverview } from "@/lib/data";
export default function Intro(){return <Escena number={1} windows={getOverview().windows}/>;}
