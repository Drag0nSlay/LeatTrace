import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'leattrace-super-secret-key-1337';

app.use(cors());
app.use(express.json());

// Enable helmet with adjusted content security policies for iframe/assets if needed
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// --- DATABASE IN-MEMORY STORAGE WITH FILE PERSISTENCE ---
let db = {
  alerts: [
    { id: 'a1', chain: 'BTC', address: '1LbcPeel5s9zARansom993vX78cDf', alias: 'LockBit Ransomware Receiver', type: 'balance', threshold: 0.1, status: 'Active', createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: 'a2', chain: 'ETH', address: '0x71c20e241775e5332f143715df332f143789a71b', alias: 'Tornado.Cash Exploit Drainer', type: 'incoming', threshold: 5.0, status: 'Triggered', createdAt: new Date(Date.now() - 3600000 * 12).toISOString() }
  ],
  alertLogs: [
    { id: 'l1', alertId: 'a2', chain: 'ETH', address: '0x71c20e241775e5332f143715df332f143789a71b', txid: '0x3df5c82a17088921df3711910efc687e1f4095741b6c7ad8949be9d4b4a11c8a', message: 'Incoming transaction of 12.5 ETH detected from sanctioned address.', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), severity: 'critical' },
    { id: 'l2', alertId: 'a1', chain: 'BTC', address: '1LbcPeel5s9zARansom993vX78cDf', txid: 'a98f102cf001bc93ef7d3910c8f18d7f1bc38d9ad7c91c89be1f67fa678f10b2', message: 'Balance dropped below threshold: wallet moved 45.8 BTC.', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), severity: 'warning' }
  ],
  savedCases: [
    { id: 'c1', name: 'LockBit Ransomware Campaign v4', chain: 'BTC', target: '1LbcPeel5s9zARansom993vX78cDf', notes: 'Tracing funds from corporate extortions. Detected multiple peeling chain change addresses moving to high-risk exchanges.', date: new Date().toISOString() }
  ]
};

// Load database if exists
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading db file:', err);
  }
}

// Save database
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to db file:', err);
  }
}

loadDb();

// --- PRESET BLOCKCHAIN DATA FOR DETAILED SIMULATION & AML HEURISTICS ---
// These addresses correspond to interesting visual tracing graphs
const MOCK_ENTITIES = {
  // BTC Addresses
  '1LbcPeel5s9zARansom993vX78cDf': {
    name: 'LockBit Extortion Wallet', type: 'Ransomware', riskScore: 98, chain: 'BTC',
    details: 'Flagged by OFAC and Europol as primary LockBit ransomware collection point.'
  },
  '1ExchBinanceHotWallet3': {
    name: 'Binance Exchange (Hot Wallet 3)', type: 'Exchange', riskScore: 12, chain: 'BTC',
    details: 'Verified institutional exchange address. High volume, regulated.'
  },
  '1MixWasherCoinJoinVault': {
    name: 'Wasabi CoinJoin Mixer Pool', type: 'Mixer', riskScore: 85, chain: 'BTC',
    details: 'Privacy-focused coin mixing service. Heavy association with obscured fund flows.'
  },
  '1DarkSilkRoadLegacy': {
    name: 'Darknet Market (Hydra/SilkRoad Ref)', type: 'Darknet', riskScore: 95, chain: 'BTC',
    details: 'Associated with retail narcotics distribution and vendor payouts.'
  },
  '1P2PHenryOTC': {
    name: 'Henry OTC Desk (P2P)', type: 'P2P Merchant', riskScore: 48, chain: 'BTC',
    details: 'Unregulated over-the-counter broker operating out of high-risk jurisdiction.'
  },
  
  // ETH Addresses
  '0x71c20e241775e5332f143715df332f143789a71b': {
    name: 'Tornado.Cash Vault (Router)', type: 'Mixer', riskScore: 90, chain: 'ETH',
    details: 'OFAC Sanctioned mixer smart contract on Ethereum Mainnet.'
  },
  '0xExploitDeFiLending': {
    name: 'Euler Finance Exploit Drainer', type: 'Hacker Group', riskScore: 100, chain: 'ETH',
    details: 'Stolen funds from Euler Finance DeFi exploit. Traced to state-sponsored actors.'
  },
  '0xExchCoinbaseMain': {
    name: 'Coinbase Exchange (Deposit Wallet)', type: 'Exchange', riskScore: 5, chain: 'ETH',
    details: 'Regulated United States cryptocurrency exchange deposit address.'
  },
  '0xWhaleStaker': {
    name: 'Lido Ethereum Staking Node', type: 'Staking/Smart Contract', riskScore: 8, chain: 'ETH',
    details: 'Lido Finance staking liquid deposit node.'
  },

  // SOL Addresses
  'HN7c5P28vPj3p83Vz18djs83hV9as8a8d11c8eD': {
    name: 'Mango Markets Exploiter Account', type: 'Exploiter', riskScore: 99, chain: 'SOL',
    details: 'Wallet used in the $114M market manipulation exploit on Mango Markets.'
  },
  'SOL1ExchangeOkxMain': {
    name: 'OKX Exchange Hub', type: 'Exchange', riskScore: 15, chain: 'SOL',
    details: 'Central hot wallet for OKX exchange operations on Solana.'
  }
};

// Generate deterministic data based on address hash or use mock templates
function resolveAddressDetails(chain, address) {
  // Check if predefined
  if (MOCK_ENTITIES[address]) {
    return MOCK_ENTITIES[address];
  }
  
  // Generate deterministic details based on string characteristics
  const cleanAddr = address.trim();
  let name = 'Unlabeled Address';
  let type = 'External Account (EOA)';
  let riskScore = 15; // default low-mid risk
  
  // Basic heuristics for scoring
  if (cleanAddr.length < 25) {
    riskScore = 30; // anomaly
  }
  
  // Let's create visual categories based on address substrings
  if (cleanAddr.toLowerCase().includes('hack') || cleanAddr.toLowerCase().includes('drain')) {
    name = 'Suspicious Exploit Node';
    type = 'Hacker Group';
    riskScore = 95;
  } else if (cleanAddr.toLowerCase().includes('exch') || cleanAddr.toLowerCase().includes('binance') || cleanAddr.toLowerCase().includes('coinbase')) {
    name = 'Exchange Wallet Partner';
    type = 'Exchange';
    riskScore = 8;
  } else if (cleanAddr.toLowerCase().includes('mixer') || cleanAddr.toLowerCase().includes('tornado')) {
    name = 'Privacy Pool Smart Contract';
    type = 'Mixer';
    riskScore = 90;
  } else {
    // Generate risk score based on letters
    let hashVal = 0;
    for (let i = 0; i < cleanAddr.length; i++) {
      hashVal += cleanAddr.charCodeAt(i);
    }
    riskScore = (hashVal % 85) + 5; // between 5 and 90
    if (riskScore > 75) {
      type = 'Unregulated Merchant / P2P';
      name = 'High Risk OTC P2P Entity';
    } else if (riskScore > 40) {
      type = 'DeFi Smart Contract';
      name = 'Liquidity Pool Router';
    } else {
      type = 'Regular Wallet';
      name = `Retail Account (${cleanAddr.slice(0, 6)}...)`;
    }
  }

  return { name, type, riskScore, chain, details: 'Automatically categorized by LeatTrace heuristics engine.' };
}

// Generate realistic mock trace network for any requested address to provide rich graph visualization
function generateTraceGraph(chain, address, depth = 3) {
  const rootEntity = resolveAddressDetails(chain, address);
  
  const nodes = [];
  const links = [];
  
  // Add root node
  nodes.push({
    id: address,
    label: rootEntity.name,
    type: rootEntity.type,
    riskScore: rootEntity.riskScore,
    chain: chain,
    val: 1.5, // visual weight
    address: address
  });

  // Let's create realistic workflows
  // Case A: LockBit Ransomware Peeling Chain (BTC)
  if (address === '1LbcPeel5s9zARansom993vX78cDf' || rootEntity.riskScore > 80 && chain === 'BTC') {
    // We create a peeling chain:
    // Root -> Hop 1 (90% change, 10% payment to mixer) -> Hop 2 (80% change, 10% cashout to OTC, 10% mixer) -> ...
    let currentHopAddress = address;
    const totalHops = 4;
    
    for (let i = 1; i <= totalHops; i++) {
      const changeAddr = `1ChangeHop${i}_${address.slice(4, 9)}...`;
      const merchantAddr = `1MerchantExch${i}_${address.slice(4, 8)}...`;
      const mixerAddr = i === 2 ? '1MixWasherCoinJoinVault' : `1PrivacyMixPool${i}_${address.slice(4, 8)}...`;
      
      // Node details
      const changeScore = Math.max(10, rootEntity.riskScore - i * 15);
      const merchantScore = i % 2 === 0 ? 15 : 65; // OTC or Exchange
      const mixerScore = 90;
      
      nodes.push({
        id: changeAddr,
        label: `Change Output (Hop ${i})`,
        type: 'Change Address',
        riskScore: changeScore,
        chain: chain,
        val: 1.2,
        address: changeAddr
      });
      
      nodes.push({
        id: merchantAddr,
        label: i % 2 === 0 ? 'Binance Gateway' : 'OTC Exchange Desk',
        type: i % 2 === 0 ? 'Exchange' : 'P2P Merchant',
        riskScore: merchantScore,
        chain: chain,
        val: 1.0,
        address: merchantAddr
      });
      
      if (!nodes.some(n => n.id === mixerAddr)) {
        nodes.push({
          id: mixerAddr,
          label: mixerAddr === '1MixWasherCoinJoinVault' ? 'Wasabi CoinJoin Mixer Pool' : `Privacy Mixer Pool #${i}`,
          type: 'Mixer',
          riskScore: mixerScore,
          chain: chain,
          val: 1.1,
          address: mixerAddr
        });
      }

      // Links
      links.push({
        source: currentHopAddress,
        target: changeAddr,
        value: 120.5 - i * 25, // Amount BTC
        txid: `tx_change_hash_${i}_${Math.random().toString(36).substring(4, 10)}`,
        timestamp: new Date(Date.now() - i * 3600000 * 2).toISOString(),
        isChange: true
      });
      
      links.push({
        source: currentHopAddress,
        target: merchantAddr,
        value: 15.0 + i * 2,
        txid: `tx_exch_hash_${i}_${Math.random().toString(36).substring(4, 10)}`,
        timestamp: new Date(Date.now() - i * 3600000 * 2 + 1800000).toISOString()
      });

      links.push({
        source: currentHopAddress,
        target: mixerAddr,
        value: 8.5,
        txid: `tx_mix_hash_${i}_${Math.random().toString(36).substring(4, 10)}`,
        timestamp: new Date(Date.now() - i * 3600000 * 2 + 3600000).toISOString()
      });

      currentHopAddress = changeAddr;
    }
  } 
  // Case B: Tornado Cash & Exploit Drain (ETH)
  else if (address === '0x71c20e241775e5332f143715df332f143789a71b' || address === '0xExploitDeFiLending' || (chain === 'ETH' && rootEntity.riskScore > 70)) {
    // Exploit wallet -> distributes funds into tornado cash vaults, or gets washed
    const exploitAddr = '0xExploitDeFiLending';
    const tornadoAddr = '0x71c20e241775e5332f143715df332f143789a71b';
    const coinbaseAddr = '0xExchCoinbaseMain';
    const stakingAddr = '0xWhaleStaker';
    
    // Add these key nodes if not exists
    const presetNodes = [
      { id: exploitAddr, label: 'Euler Finance Exploit Drainer', type: 'Hacker Group', riskScore: 100, val: 1.4 },
      { id: tornadoAddr, label: 'Tornado.Cash Router', type: 'Mixer', riskScore: 90, val: 1.5 },
      { id: coinbaseAddr, label: 'Coinbase Main Exchange', type: 'Exchange', riskScore: 5, val: 1.2 },
      { id: stakingAddr, label: 'Lido Validator Smart Contract', type: 'Staking/Smart Contract', riskScore: 8, val: 1.1 }
    ];

    presetNodes.forEach(pn => {
      if (!nodes.some(n => n.id === pn.id)) {
        nodes.push({ ...pn, chain: chain, address: pn.id });
      }
    });

    // Create realistic graph links
    links.push({ source: exploitAddr, target: tornadoAddr, value: 450.0, txid: '0xe88a531e21b764c6b8bfd3215881a28a2b53b8110b9389e1d848135cc401bda2', timestamp: new Date(Date.now() - 3600000 * 20).toISOString() });
    links.push({ source: exploitAddr, target: stakingAddr, value: 215.0, txid: '0x9923bf6e18b1d9bc181e18d6e3cda2401f802ea7483a992bcda7f10b24de8110', timestamp: new Date(Date.now() - 3600000 * 18).toISOString() });
    links.push({ source: tornadoAddr, target: coinbaseAddr, value: 80.0, txid: '0x4fcf37e38bf8cda88bf1e3100be9dfc12140a875a909beacbe631df8dca0e381', timestamp: new Date(Date.now() - 3600000 * 10).toISOString() });
    
    // Add extra hops to show multi-level wash
    const intermediateWash = '0xWashAccount_48d28a...';
    nodes.push({ id: intermediateWash, label: 'Intermediate Mixer Cashout Wallet', type: 'Suspicious Wallet', riskScore: 78, chain: chain, val: 1.1, address: intermediateWash });
    
    links.push({ source: tornadoAddr, target: intermediateWash, value: 120.0, txid: '0xab67b6f28b76ce8110d9be8c89ad5d681283e18a287cdaefbd7e1d5cc40a8972', timestamp: new Date(Date.now() - 3600000 * 8).toISOString() });
    links.push({ source: intermediateWash, target: coinbaseAddr, value: 119.5, txid: '0xcd3412a87bfde87cbfa898efcdbe3101ff89381e18e87dcbffea53b76adbcfe2', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() });
  } 
  // Case C: Standard / General Node Trace (Dynamic)
  else {
    // Generate dynamically 3-5 neighbors, with one representing an exchange, one a P2P or contract, etc.
    const numHops = 3;
    for (let i = 1; i <= numHops; i++) {
      const neighborAddress = `${chain === 'ETH' ? '0x' : '1'}${Math.random().toString(36).substring(2, 10)}${address.slice(0, 5)}`;
      const neighborDetails = resolveAddressDetails(chain, neighborAddress);
      
      nodes.push({
        id: neighborAddress,
        label: neighborDetails.name,
        type: neighborDetails.type,
        riskScore: neighborDetails.riskScore,
        chain: chain,
        val: 1.0,
        address: neighborAddress
      });
      
      // Dynamic link
      links.push({
        source: address,
        target: neighborAddress,
        value: Number((Math.random() * 50 + 0.1).toFixed(3)),
        txid: `tx_${Math.random().toString(36).substring(2, 12)}`,
        timestamp: new Date(Date.now() - i * 7200000).toISOString()
      });
      
      // Let's create an external hop from neighbor to secondary entities to create graph depth
      const deepAddress = `${chain === 'ETH' ? '0x' : '1'}${Math.random().toString(36).substring(2, 10)}_gate`;
      const deepDetails = resolveAddressDetails(chain, deepAddress);
      nodes.push({
        id: deepAddress,
        label: deepDetails.name,
        type: deepDetails.type,
        riskScore: deepDetails.riskScore,
        chain: chain,
        val: 0.9,
        address: deepAddress
      });

      links.push({
        source: neighborAddress,
        target: deepAddress,
        value: Number((Math.random() * 15 + 0.05).toFixed(3)),
        txid: `tx_deep_${Math.random().toString(36).substring(2, 12)}`,
        timestamp: new Date(Date.now() - i * 7200000 - 3600000).toISOString()
      });
    }
  }

  return { nodes, links };
}

// --- API ENDPOINTS ---

// Authenticate user (simple login for enterprise demo)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'leattrace2026') {
    const token = jwt.sign({ username, role: 'Compliance Officer' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, token, user: { username, role: 'Compliance Officer' } });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials. Use admin / leattrace2026' });
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Global statistics dashboard
app.get('/api/stats', (req, res) => {
  const flaggedCount = Object.values(MOCK_ENTITIES).filter(e => e.riskScore >= 75).length;
  const activeAlerts = db.alerts.filter(a => a.status === 'Active').length;
  
  res.json({
    totalTracedVolume: { 
      BTC: 14502.85, 
      ETH: 89402.12, 
      SOL: 624508.90,
      BSC: 459032.18,
      POL: 892045.30,
      ADA: 2340912.45,
      AVAX: 89402.75
    },
    flaggedAddressesCount: flaggedCount + 27, // Add base number for realistic UI
    monitoredAddressesCount: db.alerts.length,
    activeAlertsTriggered: db.alertLogs.length,
    complianceScore: 94.5,
    recentInvestigations: db.savedCases.length
  });
});

// --- LIVE BLOCKCHAIN RETRIEVER FOR REAL-TIME DEEP TRACING ---

async function fetchRealBtcData(address) {
  try {
    const statsRes = await fetch(`https://mempool.space/api/address/${address}`);
    if (!statsRes.ok) throw new Error('BTC address lookup failed');
    const statsData = await statsRes.json();
    
    const txsRes = await fetch(`https://mempool.space/api/address/${address}/txs`);
    if (!txsRes.ok) throw new Error('BTC transactions lookup failed');
    const txsData = await txsRes.json();
    
    const funded = statsData.chain_stats.funded_txo_sum + statsData.mempool_stats.funded_txo_sum;
    const spent = statsData.chain_stats.spent_txo_sum + statsData.mempool_stats.spent_txo_sum;
    const balanceSat = funded - spent;
    const balanceBtc = (balanceSat / 100000000).toFixed(4) + ' BTC';
    const receivedBtc = (funded / 100000000).toFixed(4) + ' BTC';
    const sentBtc = (spent / 100000000).toFixed(4) + ' BTC';
    const txCount = statsData.chain_stats.tx_count + statsData.mempool_stats.tx_count;
    
    const nodes = [];
    const links = [];
    
    nodes.push({
      id: address,
      label: 'Live Target Wallet',
      type: 'Queried Node',
      riskScore: Math.min(80, Math.max(10, (txCount % 50) + 15)),
      chain: 'BTC',
      val: 1.5,
      address: address
    });
    
    const limitedTxs = txsData.slice(0, 3);
    limitedTxs.forEach((tx, txIdx) => {
      tx.vin.forEach((input) => {
        if (input.prevout && input.prevout.scriptpubkey_address) {
          const inAddr = input.prevout.scriptpubkey_address;
          if (inAddr !== address && !nodes.some(n => n.id === inAddr) && nodes.length < 8) {
            nodes.push({
              id: inAddr,
              label: `Input Node #${nodes.length}`,
              type: 'Incoming Flow',
              riskScore: Math.min(85, Math.max(5, (inAddr.charCodeAt(3) || 0) % 70)),
              chain: 'BTC',
              val: 1.0,
              address: inAddr
            });
          }
          if (inAddr !== address && links.length < 12) {
            links.push({
              source: inAddr,
              target: address,
              sourceId: inAddr,
              targetId: address,
              value: Number((input.prevout.value / 100000000).toFixed(4)),
              txid: tx.txid,
              timestamp: new Date(tx.status.block_time * 1000 || Date.now()).toISOString(),
              particleOffset: Math.random()
            });
          }
        }
      });
      
      tx.vout.forEach((output) => {
        if (output.scriptpubkey_address) {
          const outAddr = output.scriptpubkey_address;
          if (outAddr !== address && !nodes.some(n => n.id === outAddr) && nodes.length < 8) {
            nodes.push({
              id: outAddr,
              label: `Output Node #${nodes.length}`,
              type: 'Outgoing Flow',
              riskScore: Math.min(85, Math.max(5, (outAddr.charCodeAt(3) || 0) % 70)),
              chain: 'BTC',
              val: 1.0,
              address: outAddr
            });
          }
          if (outAddr !== address && links.length < 12) {
            links.push({
              source: address,
              target: outAddr,
              sourceId: address,
              targetId: outAddr,
              value: Number((output.value / 100000000).toFixed(4)),
              txid: tx.txid,
              timestamp: new Date(tx.status.block_time * 1000 || Date.now()).toISOString(),
              particleOffset: Math.random()
            });
          }
        }
      });
    });

    return {
      success: true,
      metrics: {
        totalReceived: receivedBtc,
        totalSent: sentBtc,
        balance: balanceBtc,
        txCount: txCount
      },
      graph: { nodes, links }
    };
  } catch (err) {
    console.warn('Real BTC Fetch Failed, falling back to simulator:', err.message);
    return { success: false };
  }
}

async function fetchRealEthData(address) {
  try {
    const res = await fetch(`https://api.blockcypher.com/v1/eth/main/addrs/${address}?limit=3`);
    if (!res.ok) throw new Error('ETH Blockcypher API error');
    const data = await res.json();
    
    const balanceEth = (data.balance / 1000000000000000000).toFixed(4) + ' ETH';
    const receivedEth = (data.total_received / 1000000000000000000).toFixed(4) + ' ETH';
    const sentEth = (data.total_sent / 1000000000000000000).toFixed(4) + ' ETH';
    const txCount = data.n_tx || 0;
    
    const nodes = [{
      id: address,
      label: 'Live Target Wallet',
      type: 'Queried Node',
      riskScore: Math.min(80, Math.max(10, (txCount % 50) + 15)),
      chain: 'ETH',
      val: 1.5,
      address: address
    }];
    const links = [];

    const txs = data.txrefs || [];
    txs.forEach((tx, idx) => {
      const neighborAddress = tx.tx_hash ? `0x${tx.tx_hash.slice(0, 8)}...` : `0xEthNeighbor_${idx}`;
      if (!nodes.some(n => n.id === neighborAddress) && nodes.length < 8) {
        nodes.push({
          id: neighborAddress,
          label: tx.spent ? 'ETH Recipient' : 'ETH Sender',
          type: 'External Wallet',
          riskScore: Math.min(80, Math.max(5, (tx.value % 60) + 10)),
          chain: 'ETH',
          val: 1.0,
          address: neighborAddress
        });
        links.push({
          source: tx.spent ? address : neighborAddress,
          target: tx.spent ? neighborAddress : address,
          sourceId: tx.spent ? address : neighborAddress,
          targetId: tx.spent ? neighborAddress : address,
          value: Number((tx.value / 1000000000000000000).toFixed(4)),
          txid: tx.tx_hash || `eth_tx_${idx}`,
          timestamp: new Date(tx.confirmed || Date.now()).toISOString(),
          particleOffset: Math.random()
        });
      }
    });

    return {
      success: true,
      metrics: {
        totalReceived: receivedEth,
        totalSent: sentEth,
        balance: balanceEth,
        txCount: txCount
      },
      graph: { nodes, links }
    };
  } catch (err) {
    console.warn('Real ETH Fetch Failed, falling back to simulator:', err.message);
    return { success: false };
  }
}

async function fetchRealSolData(address) {
  try {
    const balanceRes = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      })
    });
    if (!balanceRes.ok) throw new Error('Solana RPC getBalance failed');
    const balanceJson = await balanceRes.json();
    if (balanceJson.error) throw new Error(balanceJson.error.message);
    const balanceSol = (balanceJson.result.value / 1000000000).toFixed(3) + ' SOL';

    const signaturesRes = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [address, { limit: 5 }]
      })
    });
    if (!signaturesRes.ok) throw new Error('Solana RPC signatures failed');
    const signaturesJson = await signaturesRes.json();
    const sigs = signaturesJson.result || [];
    
    const nodes = [{
      id: address,
      label: 'Live Target Wallet',
      type: 'Queried Node',
      riskScore: Math.min(80, Math.max(10, (address.charCodeAt(4) % 60) + 10)),
      chain: 'SOL',
      val: 1.5,
      address: address
    }];
    const links = [];

    sigs.forEach((sig, idx) => {
      const neighborAddress = `SOL_${sig.signature.slice(0, 8)}...`;
      if (nodes.length < 8) {
        nodes.push({
          id: neighborAddress,
          label: idx % 2 === 0 ? 'DeFi Protocol Hub' : 'User Ledger Account',
          type: idx % 2 === 0 ? 'Smart Contract' : 'External Wallet',
          riskScore: Math.min(85, Math.max(5, sig.signature.charCodeAt(6) % 80)),
          chain: 'SOL',
          val: 1.0,
          address: neighborAddress
        });
        links.push({
          source: idx % 2 === 0 ? neighborAddress : address,
          target: idx % 2 === 0 ? address : neighborAddress,
          sourceId: idx % 2 === 0 ? neighborAddress : address,
          targetId: idx % 2 === 0 ? address : neighborAddress,
          value: Number((Math.random() * 5.0 + 0.1).toFixed(2)),
          txid: sig.signature,
          timestamp: new Date((sig.blockTime * 1000) || Date.now()).toISOString(),
          particleOffset: Math.random()
        });
      }
    });

    return {
      success: true,
      metrics: {
        totalReceived: 'N/A',
        totalSent: 'N/A',
        balance: balanceSol,
        txCount: sigs.length
      },
      graph: { nodes, links }
    };
  } catch (err) {
    console.warn('Real SOL Fetch Failed, falling back to simulator:', err.message);
    return { success: false };
  }
}

// Tracing core: retrieve full network mapping + details of queried address
app.get('/api/trace/address/:chain/:address', async (req, res) => {
  const { chain, address } = req.params;
  
  if (!address || address.length < 10) {
    return res.status(400).json({ error: 'Invalid blockchain address provided' });
  }

  // A. Check if the address matches preset high-fidelity mock cases (ransomware, mixer, defi exploit)
  const isPreset = !!MOCK_ENTITIES[address];
  
  if (isPreset) {
    const details = resolveAddressDetails(chain, address);
    const graph = generateTraceGraph(chain, address);
    return res.json({
      address,
      chain,
      details,
      graph,
      metrics: {
        totalReceived: chain === 'BTC' ? '459.82 BTC' : chain === 'ETH' ? '3,450.8 ETH' : '23,459 SOL',
        totalSent: chain === 'BTC' ? '458.12 BTC' : chain === 'ETH' ? '3,445.2 ETH' : '23,440 SOL',
        balance: chain === 'BTC' ? '1.70 BTC' : chain === 'ETH' ? '5.6 ETH' : '19 SOL',
        txCount: 42,
        riskAnalysis: {
          score: details.riskScore,
          category: details.riskScore >= 75 ? 'HIGH RISK / ILLEGITIMATE' : details.riskScore >= 40 ? 'MEDIUM RISK / SUSPICIOUS' : 'LOW RISK / CLEAN',
          directExposure: details.riskScore >= 80 ? 'Mixer/Sanctioned Direct Source' : 'Clean',
          indirectExposure: details.riskScore >= 40 && details.riskScore < 80 ? '2 Hops from Ransomware' : 'None detected within 4 hops'
        }
      }
    });
  }

  // B. Attempt live lookup on public blockchain network
  let liveData = { success: false };
  if (chain === 'BTC') {
    liveData = await fetchRealBtcData(address);
  } else if (chain === 'ETH') {
    liveData = await fetchRealEthData(address);
  } else if (chain === 'SOL') {
    liveData = await fetchRealSolData(address);
  }

  // C. If live lookup was successful, output real results
  if (liveData.success) {
    const details = resolveAddressDetails(chain, address);
    // Combine metrics and graph from live query
    return res.json({
      address,
      chain,
      details: {
        ...details,
        name: `Live Traced Node (${address.slice(0, 6)}...)`,
        details: 'Live address transaction map retrieved via public blockchain network logs.'
      },
      graph: liveData.graph,
      metrics: {
        ...liveData.metrics,
        riskAnalysis: {
          score: details.riskScore,
          category: details.riskScore >= 75 ? 'HIGH RISK / ILLEGITIMATE' : details.riskScore >= 40 ? 'MEDIUM RISK / SUSPICIOUS' : 'LOW RISK / CLEAN',
          directExposure: details.riskScore >= 80 ? 'Mixer/Sanctioned Direct Source' : 'Clean',
          indirectExposure: details.riskScore >= 40 && details.riskScore < 80 ? '2 Hops from Ransomware' : 'None detected within 4 hops'
        }
      }
    });
  }

  // D. Fallback to highly realistic simulated trace if live fetch failed
  const details = resolveAddressDetails(chain, address);
  const graph = generateTraceGraph(chain, address);
  return res.json({
    address,
    chain,
    details: {
      ...details,
      details: 'Failed to query live block logs. Generated tracing nodes using local simulation models.'
    },
    graph,
    metrics: {
      totalReceived: chain === 'BTC' ? '459.82 BTC' : chain === 'ETH' ? '3,450.8 ETH' : '23,459 SOL',
      totalSent: chain === 'BTC' ? '458.12 BTC' : chain === 'ETH' ? '3,445.2 ETH' : '23,440 SOL',
      balance: chain === 'BTC' ? '1.70 BTC' : chain === 'ETH' ? '5.6 ETH' : '19 SOL',
      txCount: 42,
      riskAnalysis: {
        score: details.riskScore,
        category: details.riskScore >= 75 ? 'HIGH RISK / ILLEGITIMATE' : details.riskScore >= 40 ? 'MEDIUM RISK / SUSPICIOUS' : 'LOW RISK / CLEAN',
        directExposure: details.riskScore >= 80 ? 'Mixer/Sanctioned Direct Source' : 'Clean',
        indirectExposure: details.riskScore >= 40 && details.riskScore < 80 ? '2 Hops from Ransomware' : 'None detected within 4 hops'
      }
    }
  });
});

// Create address alert rule
app.post('/api/monitor/alerts', (req, res) => {
  const { chain, address, alias, type, threshold } = req.body;
  if (!chain || !address) {
    return res.status(400).json({ error: 'Chain and address are required fields.' });
  }

  const newAlert = {
    id: 'a_' + Math.random().toString(36).substring(2, 9),
    chain,
    address,
    alias: alias || 'Unnamed Monitored Wallet',
    type: type || 'balance',
    threshold: Number(threshold) || 0.1,
    status: 'Active',
    createdAt: new Date().toISOString()
  };

  db.alerts.unshift(newAlert);
  saveDb();
  res.status(201).json(newAlert);
});

// Get active monitor rules
app.get('/api/monitor/alerts', (req, res) => {
  res.json(db.alerts);
});

// Delete alert rule
app.delete('/api/monitor/alerts/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = db.alerts.length;
  db.alerts = db.alerts.filter(a => a.id !== id);
  if (db.alerts.length === initialLen) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  saveDb();
  res.json({ success: true });
});

// Get alert logs (activity triggers)
app.get('/api/monitor/logs', (req, res) => {
  res.json(db.alertLogs);
});

// Simulate a block event, evaluating the rules and triggering new logs dynamically
app.post('/api/monitor/simulate', (req, res) => {
  if (db.alerts.length === 0) {
    return res.json({ triggered: false, message: 'No alert rules active to trigger.' });
  }

  // Randomly pick an active rule
  const activeAlerts = db.alerts.filter(a => a.status === 'Active');
  if (activeAlerts.length === 0) {
    return res.json({ triggered: false, message: 'No active monitoring rules available.' });
  }

  const randomRule = activeAlerts[Math.floor(Math.random() * activeAlerts.length)];
  const amountTraced = (Math.random() * 50 + 0.1).toFixed(2);
  const txid = (randomRule.chain === 'ETH' ? '0x' : '') + Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14);
  
  const newLog = {
    id: 'l_' + Math.random().toString(36).substring(2, 9),
    alertId: randomRule.id,
    chain: randomRule.chain,
    address: randomRule.address,
    txid: txid,
    message: `Trigger Alert [${randomRule.alias}]: Transaction detected moving ${amountTraced} ${randomRule.chain} (Threshold: ${randomRule.threshold}).`,
    timestamp: new Date().toISOString(),
    severity: randomRule.threshold > 10 ? 'critical' : 'warning'
  };

  db.alertLogs.unshift(newLog);
  saveDb();
  res.json({ triggered: true, log: newLog });
});

// Save search case for investigation dossier
app.post('/api/cases', (req, res) => {
  const { name, chain, target, notes } = req.body;
  if (!name || !target) {
    return res.status(400).json({ error: 'Case name and target wallet are required.' });
  }

  const newCase = {
    id: 'c_' + Math.random().toString(36).substring(2, 9),
    name,
    chain,
    target,
    notes: notes || '',
    date: new Date().toISOString()
  };

  db.savedCases.unshift(newCase);
  saveDb();
  res.status(201).json(newCase);
});

// Retrieve cases
app.get('/api/cases', (req, res) => {
  res.json(db.savedCases);
});

// --- ANTIGRAVITY RESEARCH PLATFORM ENDPOINTS ---

const ANTIGRAVITY_THEORIES = [
  {
    id: "gr",
    title: "General Relativity",
    category: "Proven Physics",
    explanation: "Einstein's geometric theory of gravitation where gravity is not an attractive force, but a manifestation of spacetime curvature. Mass-energy tells spacetime how to curve, and curved spacetime tells mass-energy how to move. Spacetime acts as a dynamic fabric shaped by mass, momentum, and stress.",
    mathematicalModel: "Einstein Field Equations: G_μν + Λ g_μν = (8πG / c^4) T_μν",
    references: [
      "Einstein, A. (1916). Die Grundlage der allgemeinen Relativitätstheorie. Annalen der Physik, 49(7).",
      "Misner, C. W., Thorne, K. S., & Wheeler, J. A. (1973). Gravitation. W. H. Freeman."
    ],
    evidenceLevel: "100% (Confirmed by gravitational lensing, GPS clock relativistic adjustments, and LIGO black hole collision waves)"
  },
  {
    id: "qg",
    title: "Quantum Gravity",
    category: "Experimental Physics",
    explanation: "A branch of physics aiming to unify General Relativity (describing gravity at cosmic scales) with Quantum Mechanics (describing forces at subatomic scales). Primary frameworks include String Theory (one-dimensional vibrating strings) and Loop Quantum Gravity (quantized discrete spacetime spin networks).",
    mathematicalModel: "Wheeler-DeWitt Equation: H_ψ(x) = 0",
    references: [
      "Rovelli, C. (2004). Quantum Gravity. Cambridge University Press.",
      "Green, M. B., Schwarz, J. H., & Witten, E. (1987). Superstring Theory. Cambridge."
    ],
    evidenceLevel: "10% (Mathematically elegant, but currently lacks direct empirical or observational validation)"
  },
  {
    id: "vacuum",
    title: "Vacuum Energy",
    category: "Proven Physics",
    explanation: "An underlying background energy that exists in space throughout the entire universe, arising from quantum field vacuum fluctuations. According to QFT, even in absolute zero and empty space, virtual particles are constantly created and annihilated, leading to a non-zero ground state energy.",
    mathematicalModel: "Zero-Point Mode Summation: E_0 = Σ (1/2) ħ ω",
    references: [
      "Milonni, P. W. (1994). The Quantum Vacuum: An Introduction to Quantum Electrodynamics. Academic Press.",
      "Zeldovich, Y. B. (1968). Cosmological constant and elementary particles. JETP Letters."
    ],
    evidenceLevel: "95% (Confirmed indirectly via Lamb shift measurements and Casimir force attractive deflection)"
  },
  {
    id: "casimir",
    title: "Casimir Effect",
    category: "Proven Physics",
    explanation: "The physical force exerted on two uncharged, parallel, perfectly conducting plates placed in a vacuum. Because the boundary conditions between plates restrict the allowed wavelengths of quantum vacuum fluctuations, the energy density between plates is lower than outside, resulting in a measurable attractive pressure.",
    mathematicalModel: "Casimir Force Per Unit Area: F/A = - (π^2 ħ c) / (240 d^4)",
    references: [
      "Casimir, H. B. (1948). On the attraction between two perfectly conducting plates. Proc. K. Ned. Akad. Wet.",
      "Lamoreaux, S. K. (1997). Demonstration of the Casimir Force in the 0.6 to 6.0 μm Range. Physical Review Letters."
    ],
    evidenceLevel: "100% (Measured in laboratories with high precision using torsion pendulums and atomic force microscopes)"
  },
  {
    id: "darkenergy",
    title: "Dark Energy",
    category: "Proven Physics",
    explanation: "A theoretical, homogeneous, non-diluting energy source that permeates all space, accounting for approximately 68.3% of the universe's total energy density. It behaves as a negative pressure fluid, generating gravitational repulsion that accelerates the cosmic expansion of the universe.",
    mathematicalModel: "Equation of State: P = w ρ c^2 (where w ≈ -1.0 for Cosmological Constant Λ)",
    references: [
      "Riess, A. G., et al. (1998). Observational evidence from supernovae for an accelerating universe. Astronomical Journal.",
      "Perlmutter, S., et al. (1999). Measurements of Omega and Lambda from 42 high-redshift supernovae. Astrophysical Journal."
    ],
    evidenceLevel: "90% (Derived from type Ia supernovae, cosmic microwave background, and baryon acoustic oscillations)"
  },
  {
    id: "warp",
    title: "Warp Drive Research",
    category: "Speculative Theories",
    explanation: "Based on the Alcubierre metric, this speculative concept describes a mechanism to achieve apparent faster-than-light travel. By warping spacetime, the bubble contracts space in front of the vessel and expands it behind. The vessel sits in a flat spacetime patch, avoiding local relativistic time dilation.",
    mathematicalModel: "Alcubierre Metric: ds^2 = -c^2 dt^2 + (dx - v_s(t) f(r_s) dt)^2 + dy^2 + dz^2",
    references: [
      "Alcubierre, M. (1994). The warp drive: hyper-fast travel within general relativity. Classical and Quantum Gravity.",
      "Lobo, F. S., & Crawford, J. S. (2003). Weak Energy Condition Violations in Alcubierre Warp Spacetimes. Physical Review D."
    ],
    evidenceLevel: "1% (Pure mathematical framework; requires unphysical macroscopic distributions of negative energy density)"
  },
  {
    id: "negativeenergy",
    title: "Negative Energy Density",
    category: "Speculative Theories",
    explanation: "Energy density that is less than zero, violating standard classical physics energy conditions (like the Weak Energy Condition). While microscopic quantum states (Casimir cavities) generate brief local negative energy densities, maintaining a macroscopic stable field of negative energy is highly speculative.",
    mathematicalModel: "Energy Condition Violation: T_μν k^μ k^ν < 0 (where k^μ is a null vector)",
    references: [
      "Ford, L. H., & Roman, T. A. (1996). Restrictions on negative energy density in quantum field theory. Physical Review D.",
      "Morris, M. S., & Thorne, K. S. (1988). Wormholes, warp drives, and energy conditions. American Journal of Physics."
    ],
    evidenceLevel: "15% (Confirmed at quantum micro-scale; completely speculative and unproven at macro/engineering scale)"
  },
  {
    id: "exotic",
    title: "Exotic Matter Concepts",
    category: "Speculative Theories",
    explanation: "Hypothetical matter that violates one or more classical energy conditions, such as possessing negative inertial mass or negative gravitational mass. If it exists, negative mass would repel normal mass and accelerate in the direction opposite to a push, presenting bizarre thermodynamic anomalies.",
    mathematicalModel: "Repulsive Force: F = m_neg * a (where gravitational force is F_g = - G * M * m_neg / r^2 > 0)",
    references: [
      "Bondi, H. (1957). Negative Mass in General Relativity. Reviews of Modern Physics.",
      "Forward, R. L. (1990). Propulsion principles from negative mass. Journal of Propulsion and Power."
    ],
    evidenceLevel: "2% (No observational or experimental evidence exists for stable macroscopic negative mass)"
  },
  {
    id: "graviton",
    title: "Graviton Theory",
    category: "Speculative Theories",
    explanation: "In quantum field theory, the graviton is a hypothetical elementary particle that mediates the force of gravitation. It must be a massless, spin-2 gauge boson because gravity has an infinite range and its source is the symmetric stress-energy tensor.",
    mathematicalModel: "Graviton Propagator: D_μν,αβ(p) ∝ ( η_μα η_νβ + η_μβ η_να - η_μν η_αβ ) / p^2",
    references: [
      "Feynman, R. P., Morinigo, F. B., & Wagner, W. G. (1995). Lectures on Gravitation. Addison-Wesley.",
      "Weinberg, S. (1965). Photons and Gravitons in S-Matrix Theory. Physical Review."
    ],
    evidenceLevel: "40% (Highly consistent with physics theory, but single gravitons are extremely difficult to detect directly)"
  },
  {
    id: "curvature",
    title: "Spacetime Curvature",
    category: "Proven Physics",
    explanation: "The degree to which the 4D geometry of spacetime deviates from flat Minkowski space. The mathematical description relies on Riemann geometry, where the curvature determines the geodesics (straightest paths) of free-falling particles, resulting in what we perceive as gravitational attraction.",
    mathematicalModel: "Geodesic Acceleration: d^2 x^μ/dτ^2 + Γ^μ_αβ (dx^α/dτ) (dx^β/dτ) = 0",
    references: [
      "Riemann, B. (1854). Ueber die Hypothesen, welche der Geometrie zu Grunde liegen. Abh. Kgl. Ges. Wiss. Göttingen.",
      "Carroll, S. M. (2004). Spacetime and Geometry: An Introduction to General Relativity. Addison-Wesley."
    ],
    evidenceLevel: "100% (Proven beyond doubt through astronomical measurements, orbit anomalies like Mercury's precession, and satellite gravity probes)"
  }
];

// In-memory simulation rate limits
const simLimits = new Map();

// Helper to log audit actions
function logAudit(role, username, action) {
  const newLog = {
    id: 'log_' + Math.random().toString(36).substring(2, 9),
    role,
    username,
    action,
    timestamp: new Date().toISOString(),
    status: 'Approved'
  };
  db.antigravityAuditLogs = db.antigravityAuditLogs || [];
  db.antigravityAuditLogs.unshift(newLog);
  if (db.antigravityAuditLogs.length > 50) {
    db.antigravityAuditLogs = db.antigravityAuditLogs.slice(0, 50);
  }
  saveDb();
}

// Antigravity Login route to support JWT token generation with roles
app.post('/api/auth/antigravity-login', (req, res) => {
  const { username, password } = req.body;
  
  let role = '';
  if (username === 'physicist' && password === 'antigravity2026') {
    role = 'Lead Physicist';
  } else if (username === 'theorist' && password === 'antigravity2026') {
    role = 'Speculative Theorist';
  } else if (username === 'admin' && password === 'leattrace2026') {
    role = 'Compliance Officer';
  } else {
    return res.status(401).json({ success: false, message: 'Invalid credentials. Use admin / leattrace2026, physicist / antigravity2026, or theorist / antigravity2026.' });
  }

  const token = jwt.sign({ username, role }, JWT_SECRET, { expiresIn: '12h' });
  logAudit(role, username, 'User logged in successfully');
  return res.json({ success: true, token, user: { username, role } });
});

// Middleware to authenticate JWT and verify target role permission
const authenticateRole = (allowedRoles) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired token' });
      req.user = decoded;
      
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: `Access Denied: Requires role(s): ${allowedRoles.join(', ')}` });
      }
      next();
    });
  };
};

// GET all physics theories
app.get('/api/antigravity/theories', (req, res) => {
  res.json(ANTIGRAVITY_THEORIES);
});

// GET all research papers
app.get('/api/antigravity/papers', (req, res) => {
  res.json(db.antigravityPapers || []);
});

// POST a new research paper
app.post('/api/antigravity/papers', authenticateRole(['Lead Physicist', 'Speculative Theorist', 'Compliance Officer']), (req, res) => {
  const { title, author, category, year, journal, citation, summary, viabilityScore, gravityClass } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required fields.' });
  }

  const newPaper = {
    id: 'p_' + Math.random().toString(36).substring(2, 9),
    title,
    author,
    category: category || 'Speculative Theories',
    year: Number(year) || new Date().getFullYear(),
    journal: journal || 'Academic Archive',
    citation: citation || `${author} (${year || new Date().getFullYear()}). ${title}.`,
    summary: summary || 'Scientific summary pending.',
    viabilityScore: Number(viabilityScore) || 50,
    gravityClass: gravityClass || 'Speculative'
  };

  db.antigravityPapers = db.antigravityPapers || [];
  db.antigravityPapers.unshift(newPaper);
  saveDb();

  logAudit(req.user.role, req.user.username, `Added new research paper: "${title}"`);
  res.status(201).json(newPaper);
});

// GET all logged experiments
app.get('/api/antigravity/experiments', (req, res) => {
  res.json(db.antigravityExperiments || []);
});

// POST log a new experiment
app.post('/api/antigravity/experiments', authenticateRole(['Lead Physicist', 'Speculative Theorist']), (req, res) => {
  const { title, researcher, status, yield: expYield, parameters, results, safetyLevel, gravityClass } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Experiment title is required.' });
  }

  const newExperiment = {
    id: 'e_' + Math.random().toString(36).substring(2, 9),
    title,
    researcher: researcher || req.user.username,
    status: status || 'In Progress',
    yield: expYield || '0.0 W',
    parameters: parameters || 'No parameters configured.',
    results: results || 'Experiment initiated, monitoring telemetry.',
    timestamp: new Date().toISOString(),
    safetyLevel: safetyLevel || 'Safe',
    gravityClass: gravityClass || 'Speculative'
  };

  db.antigravityExperiments = db.antigravityExperiments || [];
  db.antigravityExperiments.unshift(newExperiment);
  saveDb();

  logAudit(req.user.role, req.user.username, `Logged physical experiment: "${title}"`);
  res.status(201).json(newExperiment);
});

// GET all saved simulations
app.get('/api/antigravity/simulations', (req, res) => {
  res.json(db.antigravitySimulations || []);
});

// POST save a simulation configuration with rate limiter check
app.post('/api/antigravity/simulations', authenticateRole(['Lead Physicist', 'Speculative Theorist']), (req, res) => {
  const username = req.user.username;
  const role = req.user.role;

  // Rate Limiting check for Speculative Theorist role (limit: 3 saves per session)
  if (role === 'Speculative Theorist') {
    const calls = simLimits.get(username) || 0;
    if (calls >= 3) {
      return res.status(429).json({ 
        error: 'Simulation Save Rejected: Speculative Theorists are rate-limited to 3 simulation configurations per session. Please consult Lead Physicist for elevated access.' 
      });
    }
    simLimits.set(username, calls + 1);
  }

  const { title, parameters, results } = req.body;
  if (!title || !parameters) {
    return res.status(400).json({ error: 'Simulation title and parameters are required.' });
  }

  const newSim = {
    id: 's_' + Math.random().toString(36).substring(2, 9),
    title,
    creator: username,
    parameters,
    results: results || 'Simulation telemetry recorded.',
    timestamp: new Date().toISOString()
  };

  db.antigravitySimulations = db.antigravitySimulations || [];
  db.antigravitySimulations.unshift(newSim);
  saveDb();

  logAudit(role, username, `Executed & Saved simulator configuration: "${title}"`);
  res.status(201).json(newSim);
});

// GET list of researchers
app.get('/api/antigravity/researchers', (req, res) => {
  res.json(db.antigravityResearchers || []);
});

// GET system audit logs
app.get('/api/antigravity/audit-logs', authenticateRole(['Lead Physicist', 'Compliance Officer']), (req, res) => {
  res.json(db.antigravityAuditLogs || []);
});

// POST Mock server-side AI Research Assistant responses
app.post('/api/antigravity/ai-assistant/action', authenticateRole(['Lead Physicist', 'Speculative Theorist', 'Compliance Officer']), (req, res) => {
  const { action, payload } = req.body;
  
  if (!action) {
    return res.status(400).json({ error: 'Action parameter is required.' });
  }

  let aiResponse = '';
  
  switch(action) {
    case 'summarize':
      aiResponse = `### [AI ASSISTANT] LITERATURE SUMMARY
**Target Document**: "${payload.title}" (Author: ${payload.author})
**Summary**:
Based on peer-reviewed metrics and gravitational modeling, the paper describes a theoretical setup in the category of **${payload.category}**. The core physics relies on calculations of the stresses and deformations. 
In terms of engineering feasibility, this approach has a viability index of **${payload.viabilityScore}%**.
**Critical Evaluation**:
* Proven aspects: ${payload.gravityClass === 'Proven' ? 'Highly verified. The mathematical framework has zero known boundary anomalies.' : 'None. The physics violates the weak energy condition at macroscopic levels.'}
* Speculative aspects: ${payload.gravityClass !== 'Proven' ? 'Requires exotic particles or negative mass densities that are not yet observed in nature.' : 'None. Purely classical and quantum electrodynamic predictions.'}`;
      break;

    case 'compare':
      const t1 = payload.theory1;
      const t2 = payload.theory2;
      aiResponse = `### [AI ASSISTANT] THEORY COMPARISON REPORT
**Subject 1**: ${t1.title} (${t1.category})
**Subject 2**: ${t2.title} (${t2.category})

**Comparison Analysis**:
1. **Mathematical Coupling**: ${t1.title} relies on ${t1.mathematicalModel}, whereas ${t2.title} utilizes ${t2.mathematicalModel}.
2. **Scientific Consensus**: 
   * **${t1.title}** is classified as *${t1.category}* with an evidence level of *${t1.evidenceLevel}*.
   * **${t2.title}** is classified as *${t2.category}* with an evidence level of *${t2.evidenceLevel}*.
3. **Synthesis Potential**: Synthesizing these concepts requires bridging the classical-quantum divide. Specifically, resolving how vacuum pressure (Casimir fluctuations) fields impact the Ricci metric curvature tensor remains the primary challenge in quantum-loop calculations.`;
      break;

    case 'plan-experiment':
      aiResponse = `### [AI ASSISTANT] EXPERIMENTAL PLAN PROTOCOL
**Objective**: Investigate theoretical gravity-coupling for "${payload.theoryTitle}"
**Phase 1: Instrumentation Set**
- High-frequency superconducting cavity resonator
- Precision atomic force gauge with sub-nanonewton resolution
- Cryogenic shield at 1.8 Kelvin to isolate thermal vibrations

**Phase 2: Operational Steps**
1. Calibrate baseline gravitational torsion balance in a clean vacuum chamber.
2. Slowly adjust the spacing parameter to ${payload.parameterVal || 'target levels'} and record electrostatic drift.
3. Energize the microwave field to induce potential electromagnetic coupling.
4. Record mass delta fluctuations and check if values exceed background noise (3-sigma confidence).

**Safety Classification**: ${payload.riskLevel || 'Safe'} (Recommended protocols: ${payload.riskLevel === 'Hazardous' ? 'Exotic matter plasma venting, containment fields' : 'Standard lab ventilation, eye protection'})`;
      break;

    case 'track-hypothesis':
      const score = Math.floor(Math.random() * 40) + (payload.isExotic ? 5 : 45);
      aiResponse = `### [AI ASSISTANT] HYPOTHESIS TRACKING ASSESSMENT
**Hypothesis**: "${payload.description}"
**Core Pathway**: ${payload.pathway}

**Evaluation**:
- **Viability Index**: ${score}%
- **Required Technological Level**: Type I-II Cardashev Scale (requires energy fields equivalent to ${payload.isExotic ? 'macroscopic negative matter generators' : 'high-power superconducting magnets'})
- **Physical Safety Index**: ${score > 50 ? 'Medium risk - normal electromagnetic fields' : 'Critical hazard - high gravitational shear waves'}
- **Open Questions**: How do we reconcile the quantum state wave function collapse under local spatial metrics?

*Status: Registered in speculative theory vault. Recommended for simulation validation before scheduling physical lab time.*`;
      break;

    default:
      aiResponse = "Unknown action. AI assistant is unable to process this request.";
  }

  logAudit(req.user.role, req.user.username, `Invoked AI Assistant tool for action: "${action}"`);
  res.json({ response: aiResponse });
});

// Serving static React files in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Export app for serverless environments (like Vercel)
export default app;

// Only start the listener if running locally (not in a serverless function)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`  Leat Trace API Server running on port ${PORT}`);
    console.log(`  Security Headers Loaded: Helmet Configured`);
    console.log(`  Local Database Connected: Serving simulation/live proxy`);
    console.log(`===========================================================`);
  });
}
