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

[Empresa de ejemplo: esta empresa saca [N] y hace seis meses sacaba [N]. Lo que se movió fue [dimensión]: [señal concreta]. Nuestro sistema lo marcó [k] meses antes de que se viera en la caja.]

Y va en las dos direcciones: reconoce a la que está mejorando igual que a la que se tuerce.

## 3. Los productos, 75 s

El score es el motor. Encima van decisiones que hoy se toman a ciegas.

Colocación de excedentes. El score dice cuánta caja de verdad sobra y cuánto riesgo aguanta la empresa. Proponemos importe, plazo y producto, y Embat ejecuta el traspaso al banco con el que ya está conectado.

Cash pooling automático. Dentro de un grupo, la filial sobrada presta a la que necesita, y el score de la que pide fija el límite y el tipo. Es un marketplace de crédito, pero en casa.

Y un monitor que levanta la mano solo: en julio te faltan 40.000, dispón el día 3. O: estás pagando a proveedores 20 días más tarde que en marzo, esto no es un bache.

## 4. Dos empresas, 60 s

Empresa A, [ID]. Score [alto] y estable, [X] euros que no bajan en doce meses, sin ningún producto de inversión. Un producto: coloca [X] a seis meses. Al 2,5% son [Y] euros al año que hoy no gana.

Grupo B, [ID]. Tres filiales. Una con [X] de excedente, otra dispuesta [Y] en póliza al 5%, y una tercera cuyo score cae desde marzo por retraso a proveedores. Dos productos: pooling de la primera a la segunda con límite por score, y alerta de la tercera, que no cubre las cuotas de julio. El grupo se ahorra [Z] en intereses y ve el problema cuatro meses antes.

## 5. Comprador y dinero, 30 s

Lo paga la empresa, porque cada mes sin esto pierde dinero medible. Lo vende Embat: dos módulos sobre 400 clientes, más una comisión por cada colocación. Solo en este dataset hay 535 millones parados y 85 millones neteables hoy.

## 6. Cierre, 15 s

Agicap vende estas decisiones como módulos sueltos, sin score. Embat las tendría sobre un número que lee el rastro antes que nadie.

## Notas

- Evaluación real según Embat por chat: complejidad y definición de algoritmos y dimensiones, qué producto se entrega y cómo lo usan los clientes, cómo de monetizable es. El guion sigue ese orden.
- No hay test oculto ni leaderboard. La generalización se demuestra con la validación propia fuera de muestra.
- La demo corre sobre datos precalculados. Embat no va a meter datos nuevos.
- Los huecos de las secciones 2 y 4 se rellenan cuando el score esté cerrado. Las empresas A y B se pueden elegir antes con los análisis de la carpeta analysis.
