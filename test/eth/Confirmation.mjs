import Confirmation from "../../src/eth/Confirmation.mjs";
import { web3, advanceBlock } from "../utils/web3.mjs";
import { sleep, xor } from "../utils/misc.mjs";

/* ************************************************************************** */
/* Test Setup */

const confirmation = new Confirmation(web3);

/* ************************************************************************** */
/* Tests */
/* ************************************************************************** */

describe("test setup", () => {
  test("web3 version", () => {
    expect(web3.version).toBe("1.5.2");
  });
  test("initial block number is 0", async () => {
    await expect(web3.eth.getBlockNumber()).resolves.toBe(0);
  });
});

/* recent */

describe("recent", () => {
  test("initial value is 0", async () => {
    const c = await web3.eth.getBlockNumber();
    expect(c).toBe(0);
    await expect(confirmation.recent()).resolves.toBe(0);
  });

  test("recent returns new block number after at most 1s", async () => {
    const c = await web3.eth.getBlockNumber();
    await advanceBlock(); // 1
    await sleep(1000);
    await expect(confirmation.recent()).resolves.toBe(c+1);
  }, 1100);

  test("rate of updates is 1s", async () => {
    const c = await web3.eth.getBlockNumber();
    const r0 = confirmation.recent();
    await sleep(500);
    const r1 = confirmation.recent();
    await sleep(500);
    const r2 = confirmation.recent();
    expect(xor(r0 === r1, r1 === r2)).toBe(true);
    expect(r0).resolves.toBe(c);
    expect(r1).resolves.toBe(c);
    expect(r2).resolves.toBe(c);
  }, 1100);

  test("rate of updates is 1s with block advances", async () => {
    const c = await web3.eth.getBlockNumber();
    const r0 = await confirmation.recent();
    await advanceBlock(); // 2
    await sleep(500);
    const r1 = await confirmation.recent();
    await advanceBlock(); // 3
    await sleep(500);
    const r2 = await confirmation.recent();
    expect(xor(r0 === r1, r1 === r2)).toBe(true);
    expect(r2).toBeGreaterThan(c);
  }, 1100);
});

/* isConfirmed */

describe("isConfirmed", () => {

  beforeAll(async () => {
    const c = await web3.eth.getBlockNumber();
    await advanceBlock(5); // 8
  });

  test("recent is confirmed at depth 0", async () => {
    const c = await confirmation.recent();
    await expect(confirmation.isConfirmed(c, 0)).resolves.toBe(true);
  });
  test("recent is not confirmed at depth 5", async () => {
    const c = await confirmation.recent();
    await expect(confirmation.isConfirmed(c, 5)).resolves.toBe(false);
  });
  test("recent minus 5 is confirmed at depth 1", async () => {
    const c = await confirmation.recent();
    await expect(confirmation.isConfirmed(c-5, 4)).resolves.toBe(true);
  });
});

/* isConfirmed */

describe("confirmedBlock", () => {

  test("confirmedBlock at depth 0 (via recent)", async () => {
    // let some time pass so that recent() will trigger an update.
    // (alternatively we could advance the chain after inserting it into the subscription)
    // TODO add another test for that
    await sleep(1000);
    const c = await web3.eth.getBlockNumber();
    const b = confirmation.confirmedBlock(c, 0);
    await expect(b).resolves.toMatchObject({number: c});
  }, 1200);

  test("confirmedBlock at depth 0 (via subscription)", async () => {
    await confirmation.recent();
    await advanceBlock();
    // recent() is outdated and won't trigger an update for the next 1s.
    // confirmedBlock(c,0) will thus be scheduled via a subscription.
    // we thus need to advance a block to trigger a dequeue and resolution.

    const c = await web3.eth.getBlockNumber();
    const b = confirmation.confirmedBlock(c, 0);
    await sleep(100); // give the subscription some time to start and guarantee that the next block is captured
    await advanceBlock();
    await expect(b).resolves.toMatchObject({number: c});
  });

  test("confirmedBlock at depth 1", async () => {
    await sleep(1000);
    const c = await web3.eth.getBlockNumber();
    const b = confirmation.confirmedBlock(c, 1);
    await sleep(100); // give the subscription some time to start and guarantee that the next block is captured
    await advanceBlock();
    await expect(b).resolves.toMatchObject({number: c});
    await expect(web3.eth.getBlockNumber()).resolves.toBe(c+1);
  });

  test("confirmedBlock at depth 1 and 2", async () => {
    await sleep(1000);
    const c = await web3.eth.getBlockNumber();
    const p2 = confirmation.confirmedBlock(c,2);
    const p1 = confirmation.confirmedBlock(c,1);
    await sleep(200); // give the subscription some time to start and guarantee that the next block is captured
    await advanceBlock();
    await advanceBlock();
    await expect(p1).resolves.toMatchObject({number: c}),
    await expect(p2).resolves.toMatchObject({number: c}),
    await expect(web3.eth.getBlockNumber()).resolves.toBe(c + 2);
  });

  test("reject confirmedBlock at depth 0", async () => {
    const c = await web3.eth.getBlockNumber();
    const x = await web3.eth.getBlock(c - 1);
    await expect(confirmation.confirmedBlock(c, 0, x.hash)).rejects.toMatchObject({expected: x.hash});
  });

  test("reject confirmedBlock at depth 2", async () => {
    const c = await web3.eth.getBlockNumber();
    const x = await web3.eth.getBlock(c - 1);
    await advanceBlock();
    await advanceBlock();
    await expect(confirmation.confirmedBlock(c, 2, x.hash)).rejects.toMatchObject({expected: x.hash});
  });
});
