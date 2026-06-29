from typing import Dict, Any, Optional
from .protocol_registry import protocol_registry
from .pool_analyzer import pool_analyzer
from .contract_decoder import contract_decoder

class DeFiDecoderService:
    def decode_defi_transaction(self, to_address: str, input_data: str, value_eth: float) -> Dict[str, Any]:
        target = to_address.strip().lower()
        protocol = protocol_registry.lookup(target)
        
        # Parse inputs
        decoded_input = contract_decoder.decode_input(input_data)
        analysis = pool_analyzer.analyze_pool_interaction(input_data, value_eth)
        
        if protocol:
            return {
                "is_defi": True,
                "protocol_name": protocol["protocol"],
                "protocol_type": protocol["type"],
                "action": analysis["resolved_action"],
                "decoded": decoded_input,
                "value_usd": analysis["estimated_value_usd"]
            }
            
        return {
            "is_defi": False,
            "protocol_name": "Unknown contract",
            "protocol_type": "Unknown",
            "action": decoded_input["method_name"],
            "decoded": decoded_input,
            "value_usd": value_eth * 3500.0
        }

defi_decoder = DeFiDecoderService()
