import createTestToken from "../utils/test-token.mjs"
import { web3, advanceBlock, accounts } from "../utils/web3.mjs";
import LockupContract from "../../src/eth/LockupContract.mjs";
import { timeout } from "../utils/misc.mjs";

/* ************************************************************************** */
/* Test Setup */

let lockupAddress;
let tt;

beforeAll(async () => {
  lockupAddress = accounts[1];
  tt = await createTestToken(web3);
  await advanceBlock();
});

const doLockup = async () => tt.transfer(lockupAddress, 1);

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
    expect(tt.address).toBeTruthy();
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
      await expect(tt.balanceOf(a)).resolves.toBe(10000n);
    }
  });
  test("accounts can transfer TT", async () => {
    const sender = accounts[0];
    const receiver = accounts[1];
    await tt.transfer(receiver, 1);
    await expect(tt.balanceOf(sender)).resolves.toBe(9999n);
    await expect(tt.balanceOf(receiver)).resolves.toBe(10001n);
  });
});

describe("LockupContract", () => {
  test("constructor", async () => {
    const lockup = new LockupContract(web3, tt.address, lockupAddress);
    expect(lockup).toBeTruthy();
  });

  test("lockupEventsOnce", async () => {
    let done = false;
    const lockup = new LockupContract(web3, tt.address, lockupAddress);
    const p = lockup.lockupEventsOnce();
    p.then(() => done = true);
    expect(done).toBe(false);
    await doLockup();
    await expect(p).resolves.toBeTruthy();
    expect(done).toBe(true);
  });

  test("lockupEventsOnce to wrong account doesn't trigger", async () => {
    const lockup = new LockupContract(web3, tt.address, lockupAddress);
    const p = lockup.lockupEventsOnce();
    await tt.transfer(accounts[2], 1);
    await expect(timeout(100, lockup.lockupEventsOnce())).rejects.toThrowError(/Timeout/);
  });

  test("lockupEvents", async () => {
    let n = 4;
    const lockup = new LockupContract(web3, tt.address, lockupAddress);
    const events = lockup.lockupEvents();

    let result = new Promise((resolve, reject) => {
      let c = 0;
      events.on('data', () => { if (++c == n) resolve(n); });
    });

    for (let i = 0; i < n; ++i) { doLockup(1) }

    await expect(result).resolves.toBe(n);
  }, 500)
});
