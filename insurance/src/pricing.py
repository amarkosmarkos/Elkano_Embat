"""Motor de tarifa para la demo de seguro de crédito dinámico.

El score V4 es un índice de ordenación. Nunca se interpreta como PD directamente.
La frecuencia de estrés observada por tramo se convierte en una PD de impago mediante
un supuesto explícito y editable. Las cantidades son escenarios comerciales, no tarifas
actuariales validadas.
"""

from __future__ import annotations

from dataclasses import dataclass


CALIBRATION = (
    (0.00, 29.79, 0.9147),
    (29.79, 48.23, 0.6139),
    (48.23, 57.23, 0.5091),
    (57.23, 63.15, 0.4602),
    (63.15, 67.61, 0.4109),
    (67.61, 71.48, 0.4299),
    (71.48, 74.86, 0.3880),
    (74.86, 77.87, 0.3282),
    (77.87, 81.16, 0.2993),
    (81.16, 100.0, 0.2524),
)


@dataclass(frozen=True)
class PricingAssumptions:
    stress_to_default: float = 0.18
    loss_given_default: float = 0.55
    coverage: float = 0.80
    expenses_rate: float = 0.0045
    capital_margin_rate: float = 0.0035
    monthly_rate_cap: float = 0.20
    smoothing: float = 0.35


def stress_rate(score: float) -> float:
    """Frecuencia observada de evento V4 a seis meses en el tramo del score."""
    score = max(0.0, min(100.0, float(score)))
    for _low, high, rate in CALIBRATION:
        if score <= high:
            return rate
    return CALIBRATION[-1][2]


def indicated_annual_rate(score: float, assumptions: PricingAssumptions) -> float:
    """Tarifa técnica anual indicada como proporción de la exposición asegurada."""
    pd_6m = min(0.999, stress_rate(score) * assumptions.stress_to_default)
    pd_annual = 1.0 - (1.0 - pd_6m) ** 2
    expected_loss = pd_annual * assumptions.loss_given_default * assumptions.coverage
    return expected_loss + assumptions.expenses_rate + assumptions.capital_margin_rate


def renew_rate(previous_rate: float | None, indicated_rate: float, assumptions: PricingAssumptions) -> float:
    """Aplica credibilidad gradual y limita saltos mensuales de tarifa."""
    if previous_rate is None:
        return indicated_rate
    blended = previous_rate * (1.0 - assumptions.smoothing) + indicated_rate * assumptions.smoothing
    low = previous_rate * (1.0 - assumptions.monthly_rate_cap)
    high = previous_rate * (1.0 + assumptions.monthly_rate_cap)
    return max(low, min(high, blended))


def coverage_for_new_sales(score: float, delta_3m: float | None, base_coverage: float) -> float:
    """Cobertura propuesta para ventas nuevas; lo ya asegurado mantiene condiciones."""
    delta_3m = 0.0 if delta_3m is None else delta_3m
    if score < 40 or delta_3m <= -15:
        return min(base_coverage, 0.60)
    if score < 55 or delta_3m <= -8:
        return min(base_coverage, 0.70)
    if score < 70 or delta_3m <= -4:
        return min(base_coverage, 0.80)
    return base_coverage


def price_history(scores: list[float], exposure: float, assumptions: PricingAssumptions) -> list[dict[str, float]]:
    """Calcula la trayectoria mensual de tarifa y prima para una contraparte."""
    out: list[dict[str, float]] = []
    previous: float | None = None
    for score in scores:
        indicated = indicated_annual_rate(score, assumptions)
        applied = renew_rate(previous, indicated, assumptions)
        out.append(
            {
                "stress_rate_6m": stress_rate(score),
                "indicated_annual_rate": indicated,
                "applied_annual_rate": applied,
                "monthly_premium": exposure * applied / 12.0,
            }
        )
        previous = applied
    return out
