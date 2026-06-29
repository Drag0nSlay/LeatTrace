class MixerRiskEngine:
    def evaluate_risk(self, exposure_percent: float, has_peel_chain: bool) -> float:
        """Determines the risk classification based on direct mixer exposures."""
        risk = exposure_percent
        if has_peel_chain:
            risk += 25.0
        return min(risk, 100.0)

risk_engine = MixerRiskEngine()
