import Web3 from 'web3';
import LockupContract from "../../src/eth/LockupContract.mjs";

/* ************************************************************************** */
/* Test Utils */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const timeout = (ms, p) => {
    return Promise.race([
      sleep(ms).then(() => { throw new Error(`Timeout: promised rejected after ${ms}ms`) }),
      p
    ]);
};

/* ************************************************************************** */
/* Initialize Ganache Web3 Provider */

// I would prefer to just use hardhat, but it doesn't currently support 
// subscriptions because of a bug.

import ganache from "ganache-core";

/* ************************************************************************** */
/* Initialize HardHat */

// Hardhat has a bug that prevents subscriptions from working. I also was
// not able to get hardhat-ganache to work.
//
// So, for now, we use harthad only for compilation. We use ganache-core for
// everything else (via ganache.provider()).

import hre from "hardhat";

async function compileTestToken() {
  console.debug("compiling TestToken...");
  await hre.run("compile");
  console.debug("...compiled TestToken");
}

/* ************************************************************************** */
/* Web3 */

const web3 = new Web3(ganache.provider());
// const web3 = hre.web3;
const accounts = await web3.eth.getAccounts();

function advanceBlock() {
  return new Promise((resolve, reject) => {
    const arg = {
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: new Date().getTime(),
    }
    web3.currentProvider.send(arg, (err, res) => err ? reject(err) : resolve(res));
  });
};

/* ************************************************************************** */
/* Deploy Test Token */

async function deployTestToken() {

  await compileTestToken();
  console.debug("deploying TestToken...");
  const arts = await hre.artifacts.readArtifact("TestToken");

  const factory = new web3.eth.Contract(arts.abi, { from: accounts[0]});
  const transaction = factory.deploy({ 
    from: accounts[0],
    data: arts.bytecode 
  });

  const pending = transaction.send({
    // from: accounts[0],
    gas: 1500000,
    gasPrice: '30000000000000'
  });
  const contract = await pending;
  console.debug("...deployed TestToken")
  return pending;
}

/* ************************************************************************** */
/* Test Setup */

let lockupAddress;
let contract;

beforeAll(async () => {
  web3.eth.Contract.defaultAccount = accounts[0];
  lockupAddress = accounts[1];

  contract = await deployTestToken();
  contract.defaultAccount = accounts[0];

  // fund accounts with TT
  for (const r of accounts) {
    await contract.methods.mint(r, 1000).send();
  }
  await advanceBlock();
});

async function transfer(to, value) {
  return await contract.methods.transfer(to, value).send();
}

async function doLockup(value) {
  return await transfer(lockupAddress, value ?? 1);
}

async function balanceOf(addr) {
  return await contract.methods.balanceOf(addr).call().then(x => BigInt(x));
}

/* ************************************************************************** */
/* Tests */

describe("test environment", () => {
  // TODO
  // contract == ethers.getContractAt("TestToken", contract.address);

  test("getBlockNumber", async () => {
    await expect(web3.eth.getBlockNumber()).resolves.toBeGreaterThan(0);
  });
  test("time.advanceBlock", async () => {
    const c = await web3.eth.getBlockNumber();
    await advanceBlock();
    await expect(web3.eth.getBlockNumber()).resolves.toBe(c + 1);
  });
  test("contract is available", async () => {
    expect(contract.options.address).toBeTruthy();
    expect(lockupAddress).toBeTruthy();
  });
  test("accounts are funded with ether", async () => {
    for (const a of accounts) {
      const x = await web3.eth.getBalance(a).then(x => BigInt(x)); 
    }
    for (const a of accounts) {
      await expect(web3.eth.getBalance(a).then(x => BigInt(x)))
        .resolves.toBeGreaterThanOrEqual(1000000);
    }
  });
  test("accounts are funded with TT", async () => {
    for (const a of accounts) {
      await expect(balanceOf(a)).resolves.toBe(1000n);
    }
  });
  test("accounts can transfer TT", async () => {
    const sender = accounts[0];
    const receiver = accounts[1];
    await transfer(receiver, 1);
    await expect(balanceOf(sender)).resolves.toBe(999n);
    await expect(balanceOf(receiver)).resolves.toBe(1001n);
  });
});

describe("LockupContract", () => {
  test("constructor", async () => {
    const lockup = new LockupContract(web3, contract.options.address, lockupAddress);
    expect(lockup).toBeTruthy();
  });

  test("lockupEventsOnce", async () => {
    let done = false;
    const lockup = new LockupContract(web3, contract.options.address, lockupAddress);
    const p = lockup.lockupEventsOnce();
    p.then(() => done = true);
    expect(done).toBe(false);
    await doLockup();
    await expect(p).resolves.toBeTruthy();
    expect(done).toBe(true);
  });

  test("lockupEventsOnce to wrong account doesn't trigger", async () => {
    const lockup = new LockupContract(web3, contract.options.address, lockupAddress);
    const p = lockup.lockupEventsOnce();
    await transfer(accounts[2], 1);
    await expect(timeout(100, lockup.lockupEventsOnce())).rejects.toThrowError(/Timeout/);
  });

  test("lockupEvents", async () => {
    let n = 4;
    const lockup = new LockupContract(web3, contract.options.address, lockupAddress);
    const events = lockup.lockupEvents();

    let result = new Promise((resolve, reject) => {
      let c = 0;
      events.on('data', () => { if (++c == n) resolve(n); });
    });

    for (let i = 0; i < n; ++i) { doLockup(1) }

    await expect(result).resolves.toBe(n);
  }, 500)
});
