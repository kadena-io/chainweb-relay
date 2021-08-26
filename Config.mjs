import pact from "pact-lang-api";
import { config as _config } from 'dotenv';

_config();

/* ************************************************************************** */
/* README
 *
 * Default environment:
 *
 * - DEFAULT_ENV (production|ropsten|kovan, default: kovan)
 *
 * Required settings for relay-app:
 *
 * - BOND_NAME
 * - PACT_PRIVATE_KEY
 * - INFURA_API_TOKEN: undefined,
 *
 * Required settings for testing with lockup transfers
 *
 * - ETH_TEST_PRIVATE_KEY
 * - INFURA_API_TOKEN
 *
 * Usually set via default environment:
 *
 * - ETH_NETWORK_ID
 * - ETH_CONTRACT_ADDR
 * - ETH_LOCKUP_PUBLIC_KEY
 *
 * All other settings are mainly for debugging and testing purposes
 *
 */

/* ************************************************************************** */
/* Some ERC-20 contract Addresses */

const usdtMainnet = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const usdtRopsten = '0x6ee856ae55b6e1a249f04cd3b947141bc146273c';
const tstKovan = '0x5679f3797da4073298284fc47c95b98a74e7eba7';
const tstRopsten = '0x722dd3f80bac40c951b51bdd28dd19d435762180';

/* ************************************************************************** */
/* Default Eth Configurations */

/* Ethereum Kovan */
const ethKovan = {
  /* Secrets */
  INFURA_API_TOKEN: undefined,

  /* ERC-20 Token Settings */
  ETH_NETWORK_ID: "kovan",
  ETH_CONTRACT_ADDR: tstKovan,
  ETH_URL: undefined,
  ETH_TEST_PUBLIC_KEY: undefined,
  ETH_TEST_PRIVATE_KEY: undefined,
  ETH_LOCKUP_PUBLIC_KEY: '0xc7eBC02Ec03d33716FB47b6702498B6C3dEBa83e',
  ETH_LOCKUP_PRIVATE_KEY: undefined,
  ETH_CONFIRMATION_DEPTH: 15,
}

/* Ethereum Ropsten */
const ethRopsten = {
  /* Secrets */
  INFURA_API_TOKEN: undefined,

  /* ERC-20 Token Settings */
  ETH_NETWORK_ID: "ropsten",
  ETH_CONTRACT_ADDR: tstRopsten,
  ETH_URL: undefined,
  ETH_TEST_PUBLIC_KEY: undefined,
  ETH_TEST_PRIVATE_KEY: undefined,
  ETH_LOCKUP_PUBLIC_KEY: undefined,
  ETH_LOCKUP_PRIVATE_KEY: undefined,
  ETH_CONFIRMATION_DEPTH: 10,
}

/* Mainnet */
const ethMainnet = {
  /* Secrets */
  INFURA_API_TOKEN: undefined,

  /* ERC-20 Token Settings */
  ETH_NETWORK_ID: "mainnet",
  ETH_URL: undefined,
  ETH_CONTRACT_ADDR: undefined,
  ETH_TEST_PUBLIC_KEY: undefined,
  ETH_TEST_PRIVATE_KEY: undefined,
  ETH_LOCKUP_PUBLIC_KEY: undefined,
  ETH_LOCKUP_PRIVATE_KEY: undefined,
  ETH_CONFIRMATION_DEPTH: 20, // expected 5min on average; better do your own research
}

/* ************************************************************************** */
/* Default Pact Configurations */

const pactDevnet = {
  PACT_PRIVATE_KEY: pact.crypto.genKeyPair().secretKey,
  BOND_NAME: 'TestBonder:0',
  PACT_NETWORK_ID: 'development',
  PACT_SERVER: 'http://devnet-api',
  PACT_CHAIN_ID: "0",
  PACT_MODULE: "relay.relay",
  PACT_POOL_MODULE: "relay.pool",
  PACT_RELAY_GAS_STATION: "relay.gas-station",
  PACT_TTL: 1200,
  PACT_GAS_PRICE: 0.000000000001,
  PACT_GAS_LIMIT: 2000,
  PACT_ENDORSE_GAS_LIMIT: 700,
  PACT_PROPOSE_GAS_LIMIT: 10000,
  PACT_HIGH_GAS_LIMIT: 60000,
  PACT_HIGH_GAS_PRICE: 0.00000001,
  PACT_RECENT_BLOCKS: 30,
  PACT_CONFIRM_DEPTH: 2,
}

const pactTestnet = {
  PACT_PRIVATE_KEY: undefined,
  BOND_NAME: undefined,
  PACT_NETWORK_ID: 'testnet04',
  PACT_SERVER: 'https://api.testnet.chainweb.com',
  PACT_CHAIN_ID: "1",
  PACT_MODULE: "relay.relay",
  PACT_POOL_MODULE: "relay.pool",
  PACT_RELAY_GAS_STATION: "relay.gas-station",
  PACT_TTL: 1200,
  PACT_GAS_PRICE: 0.000000000001,
  PACT_GAS_LIMIT: 4000,
  PACT_ENDORSE_GAS_LIMIT: 700,
  PACT_PROPOSE_GAS_LIMIT: 10000,
  PACT_HIGH_GAS_LIMIT: 60000,
  PACT_HIGH_GAS_PRICE: 0.00000001,
  PACT_RECENT_BLOCKS: 30,
  PACT_CONFIRM_DEPTH: 2,
}

const pactMainnet = {
  BOND_NAME: undefined,
  PACT_PRIVATE_KEY: undefined,
  PACT_NETWORK_ID: 'mainnet01',
  PACT_SERVER: 'https://api.chainweb.com',
  PACT_CHAIN_ID: undefined,
  PACT_MODULE: undefined,
  PACT_POOL_MODULE: undefined,
  PACT_RELAY_GAS_STATION: undefined,
  PACT_TTL: 1200,
  PACT_GAS_PRICE: 0.000000000001,
  PACT_GAS_LIMIT: 2000,
  PACT_ENDORSE_GAS_LIMIT: 700,
  PACT_PROPOSE_GAS_LIMIT: 10000,
  PACT_HIGH_GAS_LIMIT: 60000,
  PACT_HIGH_GAS_PRICE: 0.00000001,
  PACT_RECENT_BLOCKS: 30,
  PACT_CONFIRM_DEPTH: 10, // expected 5min on average
}

/* ************************************************************************** */
/* Select Defaults */

const ropstenConfig = {
  ... ethRopsten,
  ... pactTestnet,
  LOG_LEVEL: 'info',
};

const kovanConfig = {
  ... ethKovan,
  ... pactTestnet,
  LOG_LEVEL: 'debug',
};

// TODO: fill in default values above
const prodConfig = {
  ... ethMainnet,
  ... pactMainnet,
  LOG_LEVEL: 'warn',
};

let defaultConfig = kovanConfig;

switch (process.env.DEFAULT_ENV) {
  case "kovan":
    defaultConfig = kovanConfig;
    break;
  case "ropsten":
    defaultConfig = ropstenConfig;
    break;
  case "production":
    defaultConfig = prodConfig;
    break;
  default:
    defaultConfig = kovanConfig;
    break;
}

/* ************************************************************************** */
/* Evaluate Configuration */

/* TODO check for undefined values */

let config = {};

/* Logging */

config.LOG_LEVEL = process.env.LOG_LEVEL || defaultConfig.LOG_LEVEL;

/* Secrets and User Settings */
config.INFURA_API_TOKEN = process.env.INFURA_API_TOKEN || defaultConfig.INFURA_API_TOKEN;
config.BOND_NAME = process.env.BOND_NAME || defaultConfig.BOND_NAME;
config.PACT_PRIVATE_KEY = process.env.PACT_PRIVATE_KEY || defaultConfig.PACT_PRIVATE_KEY;

/* ERC-20 Token Settings */
config.ETH_NETWORK_ID = process.env.ETH_NETWORK_ID || defaultConfig.ETH_NETWORK_ID;
config.ETH_CONTRACT_ADDR = process.env.ETH_CONTRACT_ADDR || defaultConfig.ETH_CONTRACT_ADDR;
config.ETH_TEST_PUBLIC_KEY = process.env.ETH_TEST_PUBLIC_KEY || defaultConfig.ETH_TEST_PUBLIC_KEY;
config.ETH_TEST_PRIVATE_KEY = process.env.ETH_TEST_PRIVATE_KEY || defaultConfig.ETH_TEST_PRIVATE_KEY;
config.ETH_LOCKUP_PUBLIC_KEY = process.env.ETH_LOCKUP_PUBLIC_KEY || defaultConfig.ETH_LOCKUP_PUBLIC_KEY;
config.ETH_LOCKUP_PRIVATE_KEY = process.env.ETH_LOCKUP_PRIVATE_KEY || defaultConfig.ETH_LOCKUP_PRIVATE_KEY;
config.ETH_CONFIRMATION_DEPTH = process.env.ETH_CONFIRMATION_DEPTH || defaultConfig.ETH_CONFIRMATION_DEPTH;

config.ETH_URL = process.env.ETH_URL
  || defaultConfig.ETH_URL
  || `wss://${config.ETH_NETWORK_ID}.infura.io/ws/v3/${config.INFURA_API_TOKEN}`;

/* Pact Settings */
config.PACT_NETWORK_ID = process.env.PACT_NETWORK_ID || defaultConfig.PACT_NETWORK_ID;
config.PACT_SERVER = process.env.PACT_SERVER || defaultConfig.PACT_SERVER;
config.PACT_CHAIN_ID = process.env.PACT_CHAIN_ID || defaultConfig.PACT_CHAIN_ID;
config.PACT_MODULE = process.env.PACT_MODULE || defaultConfig.PACT_MODULE;
config.PACT_RELAY_GAS_STATION = process.env.PACT_RELAY_GAS_STATION || defaultConfig.PACT_RELAY_GAS_STATION;
config.PACT_POOL_MODULE = process.env.PACT_POOL_MODULE || defaultConfig.PACT_POOL_MODULE;
config.PACT_URL = process.env.PACT_URL
  || defaultConfig.PACT_URL
  || `${config.PACT_SERVER}/chainweb/0.0/${config.PACT_NETWORK_ID}/chain/${config.PACT_CHAIN_ID}/pact`;

config.PACT_TTL = process.env.PACT_TTL || defaultConfig.PACT_TTL;
config.PACT_GAS_PRICE = process.env.PACT_GAS_PRICE || defaultConfig.PACT_GAS_PRICE;
config.PACT_GAS_LIMIT = process.env.PACT_GAS_LIMIT || defaultConfig.PACT_GAS_LIMIT;
config.PACT_PROPOSE_GAS_LIMIT = process.env.PACT_PROPOSE_GAS_LIMIT || defaultConfig.PACT_PROPOSE_GAS_LIMIT;
config.PACT_ENDORSE_GAS_LIMIT = process.env.PACT_ENDORSE_GAS_LIMIT || defaultConfig.PACT_ENDORSE_GAS_LIMIT;
config.PACT_HIGH_GAS_LIMIT = process.env.PACT_HIGH_GAS_LIMIT || defaultConfig.PACT_HIGH_GAS_LIMIT;
config.PACT_HIGH_GAS_PRICE = process.env.PACT_HIGH_GAS_PRICE || defaultConfig.PACT_HIGH_GAS_PRICE;

/* Pact Events*/
config.PACT_RECENT_BLOCKS = process.env.PACT_RECENT_BLOCKS || defaultConfig.PACT_RECENT_BLOCKS;
config.PACT_CONFIRM_DEPTH = process.env.PACT_CONFIRM_DEPTH || defaultConfig.PACT_CONFIRM_DEPTH;

/* ************************************************************************** */
/* Export */

export default config;
