import styles from "./CompanyBoat.module.css";

const boats={
  a:{src:"/images/company-a-small-boat.png",alt:"Pequeño velero de madera sobre el mar",caption:"Cash pooling y seguros de David"},
  b:{src:"/images/company-b-luxury-ship.png",alt:"Barco de vela de lujo sobre el mar",caption:"Colocación de excedentes"},
};

export function CompanyBoat({company,compact=false}:{company:"a"|"b";compact?:boolean}){
  const boat=boats[company];
  return <figure className={`${styles.boat} ${compact?styles.compact:""}`}>
    <img src={boat.src} alt={boat.alt} width={1024} height={1024}/>
    {!compact&&<figcaption>{boat.caption}</figcaption>}
  </figure>;
}
