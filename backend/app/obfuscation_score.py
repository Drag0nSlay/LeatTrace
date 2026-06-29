class ObfuscationScoreCalculator:
    def calculate_score(self, hops: int, splits_count: int, rapid_wallets: bool) -> float:
        """Computes a percentage score modeling how heavily transactions are obfuscated."""
        score = 10.0
        score += min(hops * 15.0, 45.0)
        score += min(splits_count * 10.0, 30.0)
        if rapid_wallets:
            score += 15.0
            
        return min(score, 100.0)

obfuscation_scorer = ObfuscationScoreCalculator()
