require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { ethers } = require('ethers');

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Wallet Service
class WalletService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
    );
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      const network = await this.provider.getNetwork();
      if (network.chainId !== 1) throw new Error('Not connected to mainnet!');
      const balance = await this.getBalance();
      this.isInitialized = true;
      console.log('✅ Wallet Service initialized');
      console.log(`📍 Network: Ethereum Mainnet (chainId: ${network.chainId})`);
      console.log(`💼 Address: ${this.wallet.address}`);
      console.log(`💰 Balance: ${balance} ETH`);
    } catch (error) {
      console.error('❌ Wallet initialization failed:', error.message);
    }
  }

  async getBalance() {
    const balance = await this.wallet.getBalance();
    return ethers.utils.formatEther(balance);
  }

  async sendETH(toAddress, amount) {
    if (!ethers.utils.isAddress(toAddress)) throw new Error('Invalid address');
    const gasPrice = await this.provider.getGasPrice();
    const tx = await this.wallet.sendTransaction({
      to: toAddress,
      value: ethers.utils.parseEther(amount.toString()),
      gasLimit: 21000,
      gasPrice: gasPrice
    });
    console.log(`📤 TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
    return { success: true, txHash: tx.hash, blockNumber: receipt.blockNumber };
  }

  getAddress() { return this.wallet.address; }
  isReady() { return this.isInitialized; }
}

// AI Agent
class AIAgent {
  constructor(name, capabilities) {
    this.name = name;
    this.capabilities = capabilities;
    this.stats = { tasksCompleted: 0, totalEarnings: 0, successRate: 0.75 };
    this.isActive = true;
  }

  async findTasks() {
    console.log(`🔍 ${this.name} searching for tasks...`);
    await new Promise(r => setTimeout(r, 1000));
    return [
      { id: Date.now(), title: 'Sample Task', reward: 0.01, keywords: this.capabilities }
    ];
  }

  async executeTask(task) {
    console.log(`⚙️  ${this.name} executing: ${task.title}`);
    await new Promise(r => setTimeout(r, 2000));
    const success = Math.random() > 0.25;
    if (success) {
      this.stats.tasksCompleted++;
      this.stats.totalEarnings += task.reward;
      console.log(`✅ ${this.name} completed (+${task.reward} ETH)`);
      return { success: true, earnings: task.reward };
    }
    return { success: false };
  }

  getStats() { return { name: this.name, isActive: this.isActive, ...this.stats }; }
}

// Orchestrator
class Orchestrator {
  constructor(walletService) {
    this.walletService = walletService;
    this.agents = [
      new AIAgent('GitcoinAgent', ['smart-contract', 'web3']),
      new AIAgent('UpworkAgent', ['frontend', 'react']),
      new AIAgent('BountyAgent', ['testing', 'security'])
    ];
    this.isRunning = false;
    this.stats = { totalEarnings: 0, tasksCompleted: 0, cycleCount: 0 };
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('\n🚀 AUTONOMOUS ORCHESTRATOR STARTING\n');
    this.runCycle();
  }

  async runCycle() {
    while (this.isRunning) {
      try {
        this.stats.cycleCount++;
        console.log(`\n🔄 === CYCLE ${this.stats.cycleCount} ===`);
        
        for (const agent of this.agents.filter(a => a.isActive)) {
          const tasks = await agent.findTasks();
          for (const task of tasks.slice(0, 2)) {
            const result = await agent.executeTask(task);
            if (result.success) {
              this.stats.totalEarnings += result.earnings;
              this.stats.tasksCompleted++;
            }
          }
        }
        
        console.log(`💰 Total Earned: ${this.stats.totalEarnings.toFixed(4)} ETH`);
        console.log(`⏳ Waiting 5 minutes...\n`);
        await new Promise(r => setTimeout(r, 300000));
      } catch (error) {
        console.error('❌ Cycle error:', error.message);
        await new Promise(r => setTimeout(r, 60000));
      }
    }
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      totalEarnings: this.stats.totalEarnings,
      tasksCompleted: this.stats.tasksCompleted,
      agentsActive: this.agents.filter(a => a.isActive).length,
      lastSync: new Date().toLocaleTimeString(),
      agents: this.agents.map(a => a.getStats())
    };
  }

  stop() { this.isRunning = false; }
}

// Initialize
let walletService, orchestrator;

async function init() {
  console.log('\n🚀 INITIALIZING AUTONOMOUS AI PLATFORM\n');
  walletService = new WalletService();
  await new Promise(r => setTimeout(r, 3000));
  orchestrator = new Orchestrator(walletService);
  setTimeout(() => orchestrator.start(), 10000);
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    network: 'mainnet',
    timestamp: new Date().toISOString(),
    services: { 
      wallet: walletService?.isReady() || false, 
      orchestrator: orchestrator?.isRunning || false 
    }
  });
});

app.get('/api/wallet/status', async (req, res) => {
  try {
    if (!walletService) return res.status(503).json({ error: 'Not initialized' });
    const balance = await walletService.getBalance();
    res.json({ 
      address: walletService.getAddress(), 
      balance: balance, 
      network: 'mainnet' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  if (!orchestrator) return res.status(503).json({ error: 'Not initialized' });
  res.json(orchestrator.getStats());
});

app.get('/api/agents', (req, res) => {
  if (!orchestrator) return res.status(503).json({ error: 'Not initialized' });
  res.json({ success: true, agents: orchestrator.agents.map(a => a.getStats()) });
});

app.post('/api/payout', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const { toAddress, amount } = req.body;
    if (!toAddress || !amount) return res.status(400).json({ error: 'Missing fields' });
    
    const fee = amount * 0.02;
    const netAmount = amount - fee;
    const result = await walletService.sendETH(toAddress, netAmount);
    
    res.json({ success: true, ...result, amount: netAmount, fee: fee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/emergency-stop', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  orchestrator.stop();
  res.json({ success: true, message: 'Emergency stop activated' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`\n🌐 Server running on port ${PORT}`);
  await init();
});
