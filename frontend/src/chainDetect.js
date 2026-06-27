// ─── Chain address-format detection ────────────────────────────────────────
// Best-effort pattern matching per chain. Not a full checksum/validity check —
// just enough to catch "wrong chain selected for this address" before it
// ever reaches the backend.

const CHAIN_PATTERNS = [
  // Ethereum-style (also covers BSC, Polygon, Avalanche C-Chain — all use
  // the same 0x + 40 hex char format since they're EVM-compatible)
  { chain: "ETH", regex: /^0x[a-fA-F0-9]{40}$/, label: "Ethereum (ETH)" },
  { chain: "BSC", regex: /^0x[a-fA-F0-9]{40}$/, label: "Binance Smart Chain (BSC)" },
  { chain: "POL", regex: /^0x[a-fA-F0-9]{40}$/, label: "Polygon (POL)" },
  { chain: "AVAX", regex: /^0x[a-fA-F0-9]{40}$/, label: "Avalanche (AVAX)" },

  // Bitcoin: legacy (1...), P2SH (3...), or bech32 (bc1...)
  { chain: "BTC", regex: /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{25,90})$/, label: "Bitcoin (BTC)" },

  // Solana: base58, 32-44 chars, no 0x prefix
  { chain: "SOL", regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, label: "Solana (SOL)" },

  // Cardano: bech32 with addr1 prefix (Shelley era — by far the common case)
  { chain: "ADA", regex: /^addr1[a-z0-9]{20,}$/, label: "Cardano (ADA)" },
];

// Chains that share the exact same address format (can't be told apart
// from the string alone — only the user's chain choice disambiguates them)
const EVM_CHAINS = ["ETH", "BSC", "POL", "AVAX"];

/**
 * Detects which chain(s) an address format is consistent with.
 * Returns { matches: string[], isEvm: boolean }
 *   matches: list of chain codes whose format the address satisfies
 *   isEvm: true if it's a generic 0x... EVM address (ambiguous between
 *          ETH/BSC/POL/AVAX — can't auto-pick one over another)
 */
export function detectChain(address) {
  if (!address || typeof address !== "string") {
    return { matches: [], isEvm: false };
  }
  const trimmed = address.trim();

  const matches = CHAIN_PATTERNS
    .filter((p) => p.regex.test(trimmed))
    .map((p) => p.chain);

  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(trimmed);

  return { matches: [...new Set(matches)], isEvm };
}

/**
 * Given the currently selected chain and an address, figure out if there's
 * a mismatch and what chain (if any) should be auto-selected instead.
 *
 * Returns:
 *   { mismatch: false }                          — looks fine, or address too short to judge yet
 *   { mismatch: true, suggested: "BTC" }          — clear single-chain mismatch, auto-switch to this
 *   { mismatch: true, suggested: null, evmAmbiguous: true } — looks like an EVM address,
 *                                                    but could be ETH/BSC/POL/AVAX — can't
 *                                                    silently pick one if selected chain isn't EVM
 */
export function checkChainMatch(selectedChain, address) {
  if (!address || address.trim().length < 10) {
    return { mismatch: false };
  }

  const { matches, isEvm } = detectChain(address);

  // No recognizable format at all — let the backend/normal validation handle it
  if (matches.length === 0) {
    return { mismatch: false };
  }

  // Address format matches the currently selected chain — all good
  if (matches.includes(selectedChain)) {
    return { mismatch: false };
  }

  // EVM-style address but selected chain isn't one of the EVM chains —
  // we know it's wrong, but can't silently guess which EVM chain to use.
  // Default to ETH (most common) since user asked for silent auto-correct.
  if (isEvm && !EVM_CHAINS.includes(selectedChain)) {
    return { mismatch: true, suggested: "ETH" };
  }

  // Single unambiguous match (BTC, SOL, ADA) — auto-switch to it
  if (matches.length === 1) {
    return { mismatch: true, suggested: matches[0] };
  }

  return { mismatch: false };
}

/**
 * Converts a raw backend/network error into a clean, user-facing message.
 * Backend errors (Blockstream, Etherscan, etc.) leak provider-specific
 * jargon like "base58 error" — this maps known failure signatures to
 * plain language. Falls back to a generic message for anything unrecognized.
 */
export function cleanIngestError(rawMessage, chain, address) {
  const msg = (rawMessage || "").toLowerCase();
  const chainLabel =
    CHAIN_PATTERNS.find((p) => p.chain === chain)?.label || chain;

  // Blockstream / Bitcoin: base58 decode failure = not a valid BTC address
  if (msg.includes("base58")) {
    return `This address doesn't look like a valid ${chainLabel} address. Please check the address or select the correct chain.`;
  }

  // Etherscan / EVM: invalid address format
  if (msg.includes("invalid address") || msg.includes("invalid hex")) {
    return `This address doesn't look like a valid ${chainLabel} address. Please check the address or select the correct chain.`;
  }

  // Rate limiting from upstream providers
  if (msg.includes("rate limit") || msg.includes("429")) {
    return "The blockchain data provider is rate-limiting requests right now. Please wait a moment and try again.";
  }

  // Generic 400 from any provider — usually a malformed request/address
  if (msg.includes("400")) {
    return `We couldn't process this address on ${chainLabel}. It may be malformed or belong to a different chain.`;
  }

  // Nothing matched — return a safe generic message, never the raw string
  return `We couldn't trace this address on ${chainLabel}. Please verify the address and chain, then try again.`;
}