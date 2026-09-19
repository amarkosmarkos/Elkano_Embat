import unittest

from src.pricing import (
    PricingAssumptions,
    coverage_for_new_sales,
    indicated_annual_rate,
    price_history,
    stress_rate,
)


class PricingTest(unittest.TestCase):
    def setUp(self):
        self.a = PricingAssumptions()

    def test_worse_score_has_higher_indicated_rate(self):
        self.assertGreater(indicated_annual_rate(20, self.a), indicated_annual_rate(90, self.a))

    def test_score_is_not_used_as_literal_probability(self):
        self.assertNotAlmostEqual(stress_rate(80), 0.20)

    def test_calibration_has_no_gap_between_reported_bands(self):
        self.assertEqual(stress_rate(29.80), 0.6139)

    def test_monthly_repricing_is_capped(self):
        rows = price_history([90, 10], 500_000, self.a)
        self.assertLessEqual(rows[1]["applied_annual_rate"], rows[0]["applied_annual_rate"] * 1.20 + 1e-12)

    def test_existing_base_coverage_only_reduces_for_new_sales(self):
        self.assertEqual(coverage_for_new_sales(80, 1, 0.8), 0.8)
        self.assertEqual(coverage_for_new_sales(35, -20, 0.8), 0.6)


if __name__ == "__main__":
    unittest.main()
