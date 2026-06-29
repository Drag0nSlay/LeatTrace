class RPCMetricsTracker:
    def __init__(self):
        self.request_counts = {}
        self.failure_counts = {}
        self.circuit_breakers = {}

    def record_request(self, provider: str):
        self.request_counts[provider] = self.request_counts.get(provider, 0) + 1

    def record_failure(self, provider: str):
        self.failure_counts[provider] = self.failure_counts.get(provider, 0) + 1
        if self.failure_counts[provider] >= 3:
            self.circuit_breakers[provider] = True

    def reset_failures(self, provider: str):
        self.failure_counts[provider] = 0
        self.circuit_breakers[provider] = False

    def is_tripped(self, provider: str) -> bool:
        return self.circuit_breakers.get(provider, False)

rpc_metrics = RPCMetricsTracker()
