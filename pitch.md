# Pitch: cinco minutos

Guion hablado. Las cifras son del dataset del reto, calculadas con los scripts de la carpeta analysis. Los huecos entre corchetes dependen del score final.

## 0. Apertura, 15 s

Toda empresa deja un rastro de dinero. Nosotros hemos leído el de 1.286 empresas en 250 grupos durante 24 meses: dos millones y medio de movimientos bancarios y casi 900.000 facturas.

## 1. Visión de los datos, 45 s

Se puede mirar por muchas ventanas, y cada una cuenta una historia distinta.

- Por la caja: hay 2.460 millones en cuenta corriente, y 535 de ellos llevan un año sin moverse.
- Por la deuda: 378 empresas deben 1.900 millones, y 163 no cubren las cuotas del próximo trimestre con lo que tienen.
- Por lo que cobran: 3.900 millones facturados en euros, y del saldo pendiente hoy el 88% ya está vencido.
- Por cómo pagan: la mitad de los euros a proveedores se pagan tarde, y 115 empresas han empezado a estirar en los últimos seis meses.
- Por el banco: 283 millones en comisiones, con diferencias de siete veces entre bancos comparables por el mismo servicio.
- Por el grupo: en 97 de 179 grupos hay una filial sobrada de caja mientras otra tira de póliza el mismo día.
- Por los recibos devueltos: las empresas afectadas cada mes se han triplicado en dos años.

Siete ventanas, siete verdades parciales. Ningún financiero puede mirar las siete cada mañana. ¿Y si todo esto cupiera en un solo número?

## 2. El score, 60 s

Ese número es el score. Cinco dimensiones: liquidez, calidad de cobros, disciplina de pago, carga financiera y momento. Se calcula por empresa y por mes, y lo importante no es el nivel sino la dirección.

Ejemplo, COMP_0945. En febrero sacaba 72. Hoy saca 45. Lo que se movió fue la disciplina de pago y la concentración de clientes: en abril el componente de pago pasó de sumar 6 puntos a restar 4, y en agosto resta 22. La caja bajó de 391.000 a 99.000 en tres meses y el runway cayó de 24 meses a uno. Hoy la caja se ha recuperado a 236.000 y en la foto parece una empresa normal. La trayectoria dice otra cosa.

Y va en las dos direcciones. COMP_0640 pasó de 52 a 82 en seis meses porque dejó de pagar tarde a sus proveedores. Hoy es la empresa que más caja puede colocar de su grupo.

En 182 empresas del dataset el sistema levantó la alerta antes del evento de impago, con una mediana de cuatro meses de antelación.

## 3. Los productos, 75 s

El score es el motor. Encima van decisiones que hoy se toman a ciegas.

Colocación de excedentes. El score dice cuánta caja de verdad sobra y cuánto riesgo aguanta la empresa. Proponemos importe, plazo y producto, y Embat ejecuta el traspaso al banco con el que ya está conectado.

Cash pooling automático. Dentro de un grupo, la filial sobrada presta a la que necesita, y el score de la que pide fija el límite y el tipo. Es un marketplace de crédito, pero en casa.

Y un monitor que levanta la mano solo: en julio te faltan 40.000, dispón el día 3. O: estás pagando a proveedores 20 días más tarde que en marzo, esto no es un bache.

## 4. Dos empresas, 60 s

Empresa A, COMP_0054. Score 71 y estable, 15 millones en cuenta corriente en el Santander y un suelo de 7,4 millones que no ha bajado en doce meses. No tiene ningún producto de inversión. Un producto: coloca 5,9 millones a seis meses. Al 2,5% son 147.000 euros al año que hoy no gana.

Grupo B, GROUP_0067. Seis filiales. COMP_1048 tiene score 85 y 2,1 millones parados. Otras tres tiran de póliza: COMP_0929 con 520.000 dispuestos y score 72, COMP_0407 con 438.000 y score 56 cayendo, COMP_0216 con 301.000 y score 60 cayendo. El sistema propone tres préstamos internos desde COMP_1048: cubre todo lo dispuesto de la primera porque su score lo aguanta, y solo la mitad de las otras dos porque están empeorando. 890.000 euros movidos dentro del grupo, unos 44.000 euros al año de intereses que dejan de pagar al banco, y las dos filiales que se tuercen quedan señaladas antes de que el problema llegue a la matriz.

Y el monitor: COMP_0636 sacaba 87 en mayo y saca 42 hoy. Ha levantado dos avisos solos: el score cae 45 puntos en tres meses por liquidez, y las cuotas del próximo trimestre no están cubiertas ni con líneas. Recomendación: mover caja del grupo o renegociar, ahora.

## 5. Comprador y dinero, 30 s

Lo paga la empresa, porque cada mes sin esto pierde dinero medible. Lo vende Embat: dos módulos sobre 400 clientes, más una comisión por cada colocación. Solo en este dataset hay 535 millones parados y 85 millones neteables hoy.

## 6. Cierre, 15 s

Agicap vende estas decisiones como módulos sueltos, sin score. Embat las tendría sobre un número que lee el rastro antes que nadie.

## Notas

- Evaluación real según Embat por chat: complejidad y definición de algoritmos y dimensiones, qué producto se entrega y cómo lo usan los clientes, cómo de monetizable es. El guion sigue ese orden.
- No hay test oculto ni leaderboard. La generalización se demuestra con la validación propia fuera de muestra.
- La demo corre sobre datos precalculados. Embat no va a meter datos nuevos.
- Las empresas del guion salen de scores_v3 (pipeline de Markos) y de las tarjetas que construye apps/web/scripts/build_demo_data.py. Ruta en la demo: /empresa/COMP_0945, /empresa/COMP_0640, /empresa/COMP_0054, /grupo/GROUP_0067, /empresa/COMP_0636.
- La antelación de 4 meses es la mediana, en 182 empresas, entre la primera alerta del score y el primer mes del episodio de impago siguiente (ventana de 6 meses). El lead time del informe de validación de Markos usa otra definición (percentil 20 del mes) y sale más bajo; en el pitch usamos la de las tarjetas y lo decimos si preguntan.
