/**
 * services/etherscan.js
 *
 * Thin wrapper around the Etherscan free-tier API.
 * Docs: https://docs.etherscan.io/api-endpoints/accounts
 *
 * Free tier limits:
 *   - 5 req/sec
 *   - 100,000 req/day
 *
 * Get a free key at https://etherscan.io/register
 */

import fetch from 'node-fetch';

// NEW — Etherscan V2
const BASE_URL  = 'https://api.etherscan.io/v2/api';
const CHAIN_ID  = '1'; // 1 = Ethereum mainnet
const API_KEY    = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken'; // fallback = public rate-limited key

/**
 * Fetch the last `limit` normal transactions for an address.
 *
 * @param {string} address   - 0x-prefixed Ethereum address
 * @param {number} limit     - max transactions to return (default 100, max 10000)
 * @param {number} startBlock - optional block to start from (0 = genesis)
 * @returns {Promise<Array>} - array of raw Etherscan tx objects
 */
export async function fetchEthTransactions(address, limit = 100, startBlock = 0) {
  // In fetchEthTransactions()
const params = new URLSearchParams({
  chainid:    CHAIN_ID,   // ← ADD THIS LINE
  module:     'account',
  action:     'txlist',
  address,
  startblock: startBlock.toString(),
  endblock:   '99999999',
  page:       '1',
  offset:     limit.toString(),
  sort:       'desc',
  apikey:     API_KEY,
});

  const url = `${BASE_URL}?${params}`;
  console.log(`[Etherscan] Fetching ${limit} txs for ${address}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Etherscan HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== '1') {
    // status '0' with message 'No transactions found' is valid
    if (data.message === 'No transactions found') {
      return [];
    }
    throw new Error(`Etherscan API error: ${data.message} – ${data.result}`);
  }

  return data.result;
}

/**
 * Fetch the last `limit` ERC-20 token transfer events for an address.
 * Useful for tracing stablecoin (USDT/USDC) flows.
 *
 * @param {string} address
 * @param {string|null} contractAddress - optional, filter by token contract
 * @param {number} limit
 */
export async function fetchEthTokenTransfers(address, contractAddress = null, limit = 100) {
  const params = new URLSearchParams({
  chainid:  CHAIN_ID,   // ← ADD THIS LINE
  module:   'account',
  action:   'tokentx',
  address,
  page:     '1',
  offset:   limit.toString(),
  sort:     'desc',
  apikey:   API_KEY,
});

  if (contractAddress) {
    params.set('contractaddress', contractAddress);
  }

  const url = `${BASE_URL}?${params}`;
  console.log(`[Etherscan] Fetching ${limit} token transfers for ${address}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Etherscan HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== '1') {
    if (data.message === 'No transactions found') return [];
    throw new Error(`Etherscan token tx error: ${data.message}`);
  }

  return data.result;
}

/**
 * Get the current ETH balance of an address (in ETH, not Wei).
 *
 * @param {string} address
 * @returns {Promise<string>} balance in ETH
 */
export async function fetchEthBalance(address) {
  const params = new URLSearchParams({
  chainid:  CHAIN_ID,   // ← ADD THIS LINE
  module:   'account',
  action:   'balance',
  address,
  tag:      'latest',
  apikey:   API_KEY,
});

  const response = await fetch(`${BASE_URL}?${params}`);
  const data     = await response.json();

  if (data.status !== '1') {
    throw new Error(`Etherscan balance error: ${data.message}`);
  }

  const weiBalance = BigInt(data.result);
  return (Number(weiBalance) / 1e18).toFixed(6);
}
