'use strict';

import { getHeaderByNumber } from "./Utils.mjs";
import PriorityQueue from "../PriorityQueue.mjs";

/* ************************************************************************** */
/* Await Confirmation */

/** Provides the following API:
 *
 * - recent()
 * - isConfirmed(number, depth)
 * - confirmedBlock(number, depth, hash = null)
 */
export default class Confirmation {

  /* lower bound on current height
   */
  last = 0;

  /* Promise of recent update. Undefined if no update is underway
   */
  updating = null;


  /* Subscription for awaiting confirmations */
  subscription = null;

  /* A priority queue of awaited block heights
   */
  queue = new PriorityQueue();

  constructor(web3, opts) {
    this.web3 = web3;

    /* Update last block at most every 5 seconds
    */
    this.rate = opts?.rate ?? 1000;
  }

  /**
   * The most recent block number
   */
  recent () {
    if (!this.updating && !this.subscription) {
      this.updating = this.web3.eth.getBlockNumber();
      this.updating
        .then(n => {
          this.last = Math.max(n, this.last);
          setTimeout(() => {
            if (this.subscription === null) {
              this.updating = null;
            }
          }, this.rate);
        })
        .catch(e => {
          this.updating = null;
          throw e;
        });
    }
    return this.updating;
  };

  /** Check whether a block number is confirmed.
   *
   * The promise fullfils at least afer `updateDelayMs` milliseconds, which
   * is an implementation constant (5000ms).
   *
   * @param {number} number - block number
   * @param {number} depth - depth to check for
   * @returns {boolean} true if the block number has reached the requested depth;
   */
  async isConfirmed (number, depth) {
    if (number + depth <= this.last) {
      return true;
    } else {
      await this.recent();
      return number + depth <= this.last;
    }
  };

  /* Internal: Subscribe to Ethereum block headers and await confirmation
   * of all scheduled block numbers.
   */
  runSubscription () {
    if (! this.subscription) {

      // resume subscription if it has been suspended
      this.subscription = this.web3.eth.subscribe('newBlockHeaders');

      // If something goes wrong, we'll just throw away everything and the user has to start over
      this.subscription.on("error", e => {
        let entry;
        while (entry = this.queue.remove()) {
          entry.reject(e);
        }
        this.stopSubscription();
        throw e;
      });

      this.subscription.on("data", hdr => {

        // ignore removed and pending blocks
        // (the removed property isn't documented but has been observed in the wild)
        //
        if (! hdr.removed && hdr.number && hdr.hash) {

          // update our notion of the recent height
          this.last = Math.max(hdr.number, this.last);
          this.updating = Promise.resolve(this.last);

          // process awaited headers
          while (true) {
            const p = this.queue.peekPriority();

            // empty queue, nothing is currently awaited
            if (!p) {
              this.stopSubscription();
              break;

            // all awaited blocks are still unconfirmed
            } else if (hdr.number < p) {
              break;

            // process awaited Block
            } else {
              // dequeue and resolve confirmed block header
              this.dequeue();
            }
          }
        }
      });
    }
  };

  /* internal
   */
  stopSubscription() {
    this.subscription.unsubscribe((err, suc) => { return; });
    this.subscription = null;
    this.updating = null;
    this.queue.clear();
  };

  /* internal
   *
   * @param {number} number - block number
   * @param {string} [hash] - optional hash
   * @param {object} [header] - optional header
   */
  enqueue(number, depth) {
    const promise = new Promise((resolve, reject) => {
      this.queue.insert(number + depth, {
        resolve: resolve,
        reject: reject,
        number: number,
      });
    });
    this.runSubscription();
    return promise;
  };

  /* internal
   */
  dequeue() {
    const entry = this.queue.remove();
    getHeaderByNumber(this.web3, entry.number).then(header => entry.resolve(header));
  };

  /**
   * Await confirmation of a block number
   *
   * @param {number} number - the block number to await
   * @param {number} depth - the depth at which to await the block
   * @param {string} [hash] - optional hash.
   * @returns {Promis<Object>} the header of the given number when it has reached the requested depth
   */
  async confirmedBlock (number, depth, hash) {
    const hdr = (await this.isConfirmed(number, depth)) === true
      ? await getHeaderByNumber(this.web3, number)
      : await this.enqueue(number, depth);
    if (hash && hash != hdr.hash) {
      return Promise.reject({expected: hash, actual: hdr.hash});
    } else {
      return Promise.resolve(hdr);
    }
  };
}

