/**
 * services/etherscan.js — Etherscan V2 API
 * Free key: https://etherscan.io/register
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = '1'; // Ethereum mainnet
const API_KEY  = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';

export async function fetchEthTransactions(address, limit = 100, startBlock = 0) {
  const params = new URLSearchParams({
    chainid:    CHAIN_ID,
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

  console.log(`[Etherscan] Fetching ${limit} txs for ${address}`);
  const response = await fetch(`${BASE_URL}?${params}`);
  if (!response.ok) throw new Error(`Etherscan HTTP error: ${response.status}`);

  const data = await response.json();
  if (data.status !== '1') {
    if (data.message === 'No transactions found') return [];
    throw new Error(`Etherscan API error: ${data.message} – ${data.result}`);
  }
  return data.result;
}

export async function fetchEthTokenTransfers(address, contractAddress = null, limit = 100) {
  const params = new URLSearchParams({
    chainid:  CHAIN_ID,
    module:   'account',
    action:   'tokentx',
    address,
    page:     '1',
    offset:   limit.toString(),
    sort:     'desc',
    apikey:   API_KEY,
  });
  if (contractAddress) params.set('contractaddress', contractAddress);

  const response = await fetch(`${BASE_URL}?${params}`);
  if (!response.ok) throw new Error(`Etherscan HTTP error: ${response.status}`);

  const data = await response.json();
  if (data.status !== '1') {
    if (data.message === 'No transactions found') return [];
    throw new Error(`Etherscan token tx error: ${data.message}`);
  }
  return data.result;
}

export async function fetchEthBalance(address) {
  const params = new URLSearchParams({
    chainid:  CHAIN_ID,
    module:   'account',
    action:   'balance',
    address,
    tag:      'latest',
    apikey:   API_KEY,
  });

  const response = await fetch(`${BASE_URL}?${params}`);
  const data     = await response.json();
  if (data.status !== '1') throw new Error(`Etherscan balance error: ${data.message}`);

  return (Number(BigInt(data.result)) / 1e18).toFixed(6);
}