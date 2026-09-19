# Producto: seguro de crédito continuo

## Problema

El seguro de crédito suele fijar condiciones con información puntual y revisiones espaciadas. Entre dos revisiones, el comportamiento financiero del comprador puede cambiar. Cuando aparece el siniestro, la prima histórica ya no representa el riesgo observado durante los meses anteriores.

Elkano Cover conecta la póliza con una señal mensual de comportamiento financiero. El objetivo no es cancelar automáticamente una cobertura, sino detectar cambios, actualizar la tarifa futura y dirigir la atención del suscriptor.

## Usuarios

- **Empresa asegurada:** protege sus cuentas por cobrar y conoce el coste actualizado de cubrir cada cliente.
- **Suscriptor:** recibe una cola priorizada con las contrapartes cuyo riesgo ha cambiado.
- **Mediador:** explica por qué cambia una tarifa y qué condición contractual se aplica.
- **Responsable de riesgos:** controla exposición, concentración y evolución de la cartera.

## Flujo

1. La empresa declara las ventas a crédito y solicita cobertura sobre sus clientes.
2. Cada cliente se vincula con su trayectoria V4 cuando existe información suficiente.
3. Mensualmente se actualizan score, alerta, componentes y eventos observados.
4. La calibración asigna a cada tramo de score una frecuencia histórica de estrés a seis meses.
5. Un supuesto explícito convierte estrés en impago asegurado.
6. El motor calcula la tarifa indicada y aplica credibilidad gradual y límites de movimiento.
7. Si el deterioro supera los umbrales, se revisan las ventas nuevas; las facturas admitidas mantienen cobertura.

## Estados operativos

| Estado | Condición de demo | Acción |
|---|---|---|
| Estable | score ≥ 60, sin alerta y caída a 3 meses menor de 7 puntos | renovación ordinaria |
| Vigilancia | alerta, score < 60 o caída ≥ 7 puntos | seguimiento y tarifa dinámica |
| Revisión | evento activo, score < 40 o caída ≥ 15 puntos | revisión humana y posible reducción de cobertura nueva |

Los umbrales son política de demostración. Un producto real los elegiría con capacidad operativa, tolerancia al riesgo y validación actuarial.

## Protección contractual

- La prima cambia para el siguiente periodo, nunca de forma retroactiva.
- La cobertura de facturas ya admitidas se conserva.
- Las reducciones afectan a ventas futuras después de la notificación.
- Una alerta no rechaza automáticamente al cliente.
- Toda decisión conserva score, componentes, supuestos, fecha y usuario revisor.

## Valor de la historia

El producto no necesita afirmar que conoce la probabilidad verdadera de quiebra. Su valor es que convierte una señal financiera que cambia cada mes en una decisión aseguradora auditable:

`observar → detectar cambio → recalcular → revisar → proteger`
