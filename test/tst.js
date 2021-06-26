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

/* ************************************************************************** */
/* Configuration */

// Account that transfers into the lookup account
// only needed for testing lockups
const testPrivateKey = config.ETH_TEST_PRIVATE_KEY;

// Lockup Account (used in transaction.js as lookup address)
// only needed for debugging and development
const lockupPrivateKey = config.ETH_LOCKUP_PRIVATE_KEY;

/* ************************************************************************** */
/* Setup Web3 */

const web3 = new Web3(Web3.givenProvider || config.ETH_URL);
web3.eth.Contract.setProvider(config.ETH_URL);

/* ************************************************************************** */
/* Create Accounts */

const lockupAccount = lockupPrivateKey ? web3.eth.accounts.privateKeyToAccount(lockupPrivateKey) : undefined;
if (lockupAccount) {
  web3.eth.accounts.wallet.add(lockupAccount);
}

const testAccount = web3.eth.accounts.privateKeyToAccount(testPrivateKey);

// add accounts to wallet
web3.eth.accounts.wallet.create(0, web3.utils.randomHex(32));
web3.eth.accounts.wallet.add(testAccount);

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
