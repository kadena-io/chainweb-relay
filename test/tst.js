/* ************************************************************************** */
/* Test Standard Token
 *
 * This module provides utils for using TST token for testing of ERC-20.
 *
 * The token is available on the Ropsten and Kovan networks.
 *
 */

let Web3 = require("web3")
let tst = require("./abi/tst.json");
let config = require("../config");
let secrets = require("../secrets");

/* ************************************************************************** */
/* Configuration */

const testPublicKey = "0xDfd675b84eBe2f65658D711aa8FC4F1106792be8";
const testPrivateKey = secrets.key0; // undefined; // see secrets.js key0

// matches config.ETH_LOCKUP_ACCOUNT
const lookupPublicKey = '0xc7eBC02Ec03d33716FB47b6702498B6C3dEBa83e';
const lockupPrivateKey = secrets.lockupPrivateKey; // undefined; // see secrets.js

/* ************************************************************************** */
/* Setup Web3 */

const web3 = new Web3(Web3.givenProvider || config.ETH_URL);
web3.eth.Contract.setProvider(config.ETH_URL);

/* ************************************************************************** */
/* Create Accounts */

const testAccount = web3.eth.accounts.privateKeyToAccount(testPrivateKey);
const lockupAccount = web3.eth.accounts.privateKeyToAccount(lockupPrivateKey);

// add accounts to wallet
web3.eth.accounts.wallet.create(0, web3.utils.randomHex(32));
web3.eth.accounts.wallet.add(testAccount);
web3.eth.accounts.wallet.add(lockupAccount);

// set default account
web3.eth.defaultAccount = testAccount.address;

/* ************************************************************************** */
/* Initialize Test Standard Token Contract */

const contractAddr = tst.address[config.ETH_NETWORK_ID];
const contract = new web3.eth.Contract(tst.abi, contractAddr);
contract.defaultAccount = testAccount.address;
contract.options.from = testAccount.address;

/* ************************************************************************** */
/* Provide Contract Methods */

async function sendMethod(method) {
  const from = method._parent.defaultAccount;
  const nonce = await web3.eth.getTransactionCount(from, "pending");
  const gas = Math.round(await method.estimateGas() * 1.5);
  return method.send({gas: gas, nonce: nonce});
}

async function sendMethod2(method) {
  const from = method._parent.defaultAccount;
  const options = {
    to: method._parent._address,
    data: method.encodeABI(),
    nonce: await web3.eth.getTransactionCount(from, "pending"),
    gas: Math.round(await method.estimateGas() * 1.5),
    gasLimit: (await web3.eth.getBlock("latest")).gasLimit
  }

  const signed  = await web3.eth.accounts.signTransaction(options, testAccount.privateKey);
  return web3.eth.sendSignedTransaction(signed.rawTransaction);
}

async function transfer(toAcc, amount) {
  return sendMethod2(contract.methods.transfer(toAcc, amount));
}

async function fund(toAcc, amount) {
  return sendMethod2(contract.methods.showMeTheMoney(toAcc, amount));
}

async function balanceOf(acc) {
  return contract.methods.balanceOf(acc).call();
}

/* ************************************************************************** */
/* Test Accounts */

module.exports = {
  contract: contract,
  address: contractAddr,
  abi: tst.abi,
  methods: {
    sendMethod: sendMethod,
    transfer: transfer,
    balanceOf: balanceOf,
    fund: fund,
  },
  accounts: {
    test: testAccount,
    lockup: lockupAccount,
  }
};

