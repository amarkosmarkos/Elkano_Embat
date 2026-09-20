import styles from "./CompanyBoat.module.css";

const boats={
  a:{src:"/images/company-a-small-boat.png",alt:"Pequeño velero de madera sobre el mar",caption:"Atlas Motors. Cash pooling y marketplace"},
  b:{src:"/images/company-b-luxury-ship.png",alt:"Barco de vela de lujo sobre el mar",caption:"Harbor Foods. Marketplace y seguro de crédito"},
};

export function CompanyBoat({company,compact=false}:{company:"a"|"b";compact?:boolean}){
  const boat=boats[company];
  return <figure className={`${styles.boat} ${compact?styles.compact:""}`}>
    <img src={boat.src} alt={boat.alt} width={1024} height={1024}/>
    {!compact&&<figcaption>{boat.caption}</figcaption>}
  </figure>;
}
