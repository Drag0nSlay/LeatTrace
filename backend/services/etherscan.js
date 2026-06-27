/**
 * services/etherscan.js — Etherscan V2 API
 * Free key: https://etherscan.io/register
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = '1';
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

/**
 * Fetch address label from Etherscan
 * Returns label like 'Fake_Phishing3348326', 'Tornado Cash' etc. if known
 */
export async function fetchEthAddressLabel(address) {
  try {
    // Try token info first
    const tokenParams = new URLSearchParams({
      chainid:         CHAIN_ID,
      module:          'token',
      action:          'tokeninfo',
      contractaddress: address,
      apikey:          API_KEY,
    });
    const tokenRes  = await fetch(`${BASE_URL}?${tokenParams}`);
    const tokenData = await tokenRes.json();
    if (tokenData?.result?.[0]?.tokenName) {
      return tokenData.result[0].tokenName;
    }

    // Try account label via contract source
    const contractParams = new URLSearchParams({
      chainid:  CHAIN_ID,
      module:   'contract',
      action:   'getsourcecode',
      address,
      apikey:   API_KEY,
    });
    const contractRes  = await fetch(`${BASE_URL}?${contractParams}`);
    const contractData = await contractRes.json();
    if (contractData?.result?.[0]?.ContractName) {
      return contractData.result[0].ContractName;
    }

    return null;
  } catch {
    return null;
  }
}
export async function fetchEthInternalTransactions(address, limit = 100, startBlock = 0) {
  const params = new URLSearchParams({
    chainid:    CHAIN_ID,
    module:     'account',
    action:     'txlistinternal',
    address,
    startblock: startBlock.toString(),
    endblock:   '99999999',
    page:       '1',
    offset:     limit.toString(),
    sort:       'desc',
    apikey:     API_KEY,
  });

  console.log(`[Etherscan] Fetching ${limit} internal txs for ${address}`);
  const response = await fetch(`${BASE_URL}?${params}`);
  if (!response.ok) return [];
  const data = await response.json();
  if (data.status !== '1') return [];
  return data.result;
}