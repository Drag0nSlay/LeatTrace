from typing import Dict, Optional

DEFI_REGISTRY = {
    "0xe592427a0ae9002fa3f0b06d01db5d3778a2dd53": {"protocol": "Uniswap v3", "type": "Automated Market Maker Router"},
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": {"protocol": "Uniswap v2", "type": "Automated Market Maker Router"},
    "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": {"protocol": "Aave v2", "type": "Lending & Borrowing Pool"},
    "0x87870bca3f12d455540a04d96e6866a9e4b1b6e4": {"protocol": "Aave v3", "type": "Lending & Borrowing Pool"},
    "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": {"protocol": "Lido Finance", "type": "Liquid Staking Router"}
}

class DeFiProtocolRegistry:
    def lookup(self, contract_address: str) -> Optional[Dict[str, str]]:
        addr_clean = contract_address.strip().lower()
        if addr_clean in DEFI_REGISTRY:
            return DEFI_REGISTRY[addr_clean]
        return None

protocol_registry = DeFiProtocolRegistry()
