const Web3 = require("web3")
const Pact = require("pact-lang-api");
const config = require("../config");
const tools = require("./pact-tools");
const chainweb = require("chainweb");

// const { Heapify } = require("heapify");

/* ************************************************************************** */
/* Logging */

// in production set `{level: warn, prettyPrint: false}`
const logger = require('pino')({level: config.LOG_LEVEL, prettyPrint: true});

const proposeLogger = logger.child({ topic: "propose" });
const endorseLogger = logger.child({ topic: "endorse" });


/* ************************************************************************** */
/* ERC-20 contract Addresses */

const usdtMainnet = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const usdtRopsten = '0x6ee856ae55b6e1a249f04cd3b947141bc146273c';

/* ************************************************************************** */
/* Initialize Pact API Provider */

const bonder = {
  keyPair: Pact.crypto.restoreKeyPairFromSecretKey(config.PACT_PRIVATE_KEY),
  name: config.BOND_NAME,
}

/* ************************************************************************** */
/* Initialize Ethereum JSON RPC Provider */

const web3 = new Web3(Web3.givenProvider || config.ETH_URL);
web3.eth.Contract.setProvider(config.ETH_URL);

/* ************************************************************************** */
/* ERC-20 Events */

/*
Transfer(address from, address to, uint256 value)
Emitted when value tokens are moved from one account (from) to another (to).

Note that value may be zero.
*/

const erc20TransferABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "_from",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "_to",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  }
]

const contract = new web3.eth.Contract(erc20TransferABI, config.ETH_CONTRACT_ADDR);

/*
 * {
 *   removed: false,
 *   logIndex: 246,
 *   transactionIndex: 402,
 *   transactionHash: '0x48fe633209ad3d48d17dca3f0a91372a630069acdfa425a632b4ec6f75b41780',
 *   blockHash: '0x069014993acb61799864e42bb0e03df377da6773a4747322b0f04b36404ead32',
 *   blockNumber: 12467810,
 *   address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
 *   id: 'log_53661043',
 *   returnValues: Result {
 *     '0': '0x0452C9d1F95e7d60022Eb6f3a877972AA651b9A1',
 *     '1': '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
 *     '2': '1585000000',
 *     _from: '0x0452C9d1F95e7d60022Eb6f3a877972AA651b9A1',
 *     _to: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
 *     _value: '1585000000'
 *   },
 *   event: 'Transfer',
 *   signature: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
 *   raw: {
 *     data: '0x000000000000000000000000000000000000000000000000000000005e792e40',
 *     topics: [
 *       '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
 *       '0x0000000000000000000000000452c9d1f95e7d60022eb6f3a877972aa651b9a1',
 *       '0x0000000000000000000000003f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be'
 *     ]
 *   }
 * }
 */

/* ************************************************************************** */
/* Lockup Events */

// For debugging
function lockupEventsOnce (cb) {
  contract.once('Transfer', { filter: { "_to" : config.ETH_LOCKUP_PUBLIC_KEY } }, cb);
}

/* Lockup Events Emitter for a contract and a lockup accont
 */
const lockupEvents = () =>
  contract.events.Transfer({filter: {"_to": config.ETH_LOCKUP_PUBLIC_KEY}});

/* Await a given block a given height
 *
 * Returns `null` if the block doesn't exist at that height.
 *
 */
async function awaitBlock (number, hash) {
  const block = await web3.eth.getBlock(hash);
  if (block) {
    return block;
  } else {
    const s = web3.eth.subscribe('newBlockHeaders');
    return new Promise((resolve, reject) => {
      s.on('data', b => {
        if (b.number === number) {
          s.unsubscribe();
          resolve(b);
        } else if (b.number > number) {
          s.unsubscribe();
          web3.eth.getBlock(hash).then(resolve).catch(reject);
        }
      });
    });
  }
}

/*
const ethConfirmation = (confirmationDepth) => {

  const updateDelayMs = 5000;

  this.confirmationDepth = confirmationDepth;

  // lower bound on current height
  this.last = 0;

  // Promise of recent update. Undefined if no update is underway
  this.updating = undefined;

  // Get most recent block height and update last value.
  this.recent = async () => {
    if (this.updating === undefined) {
      this.updating = web3.getBlockNumber();
      this.updating
        .then(n => {
          this.last = n;
          setTimeout(() => { this.updating = undefined; }, updateDelayMs);
        })
        .catch(e => {
          this.updating = undefined;
          throw e;
        });
    }
    return await this.updating;
  }

  // Lower bound on the last confirmed height
  get this.lastConfirmed() {
    return Math.max(0, this.last - this.ConfirmationDepth);
  }

  // check if a given block height is confirmed
  this.isConfirmed = async (number) => {
    if (number <= this.lastConfirmed) {
      return true;
    } else {
      await recent();
      return number <= this.lastConfirmed;
    }
  }

  this.queue = new Heapify();

  this.runSubscrption() {

  }

  this.awaitConfirmation = async (number) => {
    if (isConfirmed(number) {
      return;
    } else {
      const promise = new Promise();
      this.queue.push(promise, - number);
      return promise;
    }
  }
}

async function awaitConfirmedBlock (number, hash, depth) {
  const block = await awaitBlock(number, hash)

  const block = await web3.eth.getBlock(hash);
  if (block) {
    return block;
  } else {
    const s = web3.eth.subscribe('newBlockHeaders');
    return new Promise((resolve, reject) => {
      s.on('data', b => {
        if (b.number === number) {
          s.unsubscribe();
          resolve(b);
        } else if (b.number > number) {
          s.unsubscribe();
          web3.eth.getBlock(hash).then(resolve).catch(reject);
        }
      });
    });
  }
}

*/

/* ************************************************************************** */
/* Proposals */

const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const eventToProposal = async (e) => {
  const block = await awaitBlock (e.blockNumber, e.blockHash);
  if (block) {
    return {
        "hash": block.hash,
        "number": block.number,
        "receipts-root": block.receiptsRoot
    };
  } else {
    throw `Unable to obtain block for event ${e}`;
  }
}

const proposals = () => {
  proposeLogger.info("Starting propose...")
  let current = null;
  const events = lockupEvents();
  events.on('data', async d => {
    const logg = proposeLogger.child({ blockNumber: d.blockNumber, blockHash: d.blockHash })
    if (d.removed) {
      logg.debug("skip removed event");
    } else if (current !== null && d.blockNumber <= current) {
      logg.debug({ current: current }, "skip non-current event");
    } else {
      current = d.blockNumber;
      s = delay(d.blockHash);
      logg.debug(`wait ${s}s`);
      await timeout(s * 1000);
      const p = await eventToProposal(d);
      logg.info("new proposal");
      try {
        submitPropose(logg, p)
      } catch(e) {
        logg.error({error: e}, "proposal failed");
      }
    }
  });
  return events;
}

// We could be more fancy and listen to propose events on the
// Kadena side and drop the proposal if it is already submitted.
//
const submitPropose = async (logg, proposal) => {

  // check that proposal hasn't been submitted yet
  const proposed = await tools.relay.propose(bonder.keyPair, config.BOND_NAME, proposal)
    .then(r => {
      logg.debug({result: r}, "local succeeded");
      return false;
    })
    .catch((e) => {
      if (e.result?.error?.message === 'Already active proposal') {
        return true;
      } else {
        logg.error({error: e}, "local propose failed");
        throw e;
      }
    });

  if (proposed) {
    logg.info("skip existing proposal");
  } else {
    logg.info(`submitting proposal`, proposal);
    const result = await tools.relay.propose(bonder.keyPair, config.BOND_NAME, proposal, false)
      .catch(e => {
        const msg = e.result?.error?.message;
        if (msg === 'Already active proposal') {
          logg.warn({warning: msg}, "proposal failed");
        } else {
          throw e;
        }
      });
    logg.debug({result: result});
    logg.info("successes");
  }
}

/* ************************************************************************** */
/* Endorsement */

const endorsement = async () => {
  endorseLogger.info("Starting endorse...");

  // Check recentEvents
  let recentEvents = await chainweb.event.recent(
      config.PACT_CHAIN_ID,
      config.PACT_CONFIRM_DEPTH,
      config.PACT_RECENT_BLOCKS,
      config.PACT_NETWORK_ID,
      `https://${config.PACT_SERVER}`
  );
  let filteredEvents = recentEvents.filter(e => e.name === "PROPOSE" && e.params[3].includes(bonder.name));
  endorseLogger.info(filteredEvents.map(e => e.params[1]), `Chainweb Events to endorse in the last ${config.PACT_RECENT_BLOCKS} blocks`);
  filteredEvents.forEach(async e => processEndorseEvent(e))

  // Listens to event stream
  chainweb.event.stream(config.PACT_CONFIRM_DEPTH, [config.PACT_CHAIN_ID], async e => {
    if (e.name === "PROPOSE" && e.params[3].includes(bonder.name)) {
      endorseLogger.debug(e, "Got PROPOSE event");
      processEndorseEvent(e);
    }
  }, config.PACT_NETWORK_ID, `https://${config.PACT_SERVER}`)
}

const processEndorseEvent = async (e) => {
  endorseLogger.debug({event: e.params[1]}, "Chainweb propose event");
  const d = {blockNumber: e.params[0].int, blockHash: e.params[1]};
  const logg = endorseLogger.child({ blockNumber: d.blockNumber, blockHash: d.blockHash })
  let blockHeader = await eventToProposal(d);
  logg.info("new endorsement");
  try {
    submitEndorse(logg, blockHeader);
  } catch(e) {
    logg.error({error: e}, "endorsment failed");
  }
}

const submitEndorse = async (logg, proposal) => {

  // check that proposal hasn't been validated yet
  const validated = await tools.relay.validate(bonder.keyPair, proposal)
    .then(r => {
      logg.info("already validated");
      return true;
    })
    .catch(e => {
      if (e.result?.error?.message === 'Not accepted') {
        logg.info("not yet validated");
        return false;
      } else {
        logg.error({error: e}, "validation failed");
        throw e;
      }
    });

  if (validated) {
    logg.info("skip validated proposal");
  } else {

    // check if header is already endorsed
    const endorsed = await tools.relay.endorse(bonder.keyPair, config.BOND_NAME, proposal)
      .then(r => {
        logg.debug({result: r}, "local succeeded");
        return false;
      })
      .catch((e) => {
        if (e.result?.error?.message === 'Duplicate endorse') {
          return true;
        } else {
          logg.error({error: e}, "local endorse failed");
          throw e;
        }
      });

    if (endorsed) {
      logg.info("skip existing endorsement");
    } else {
      logg.info(`submitting endorsement`, proposal);
      const result = await tools.relay.endorse(bonder.keyPair, bonder.name, proposal, false)
        .catch(e => {
          const msg = e.result?.error?.message;
          if (msg === 'Duplicate endorse') {
            logg.warn({warning: msg}, "endorsement failed");
          } else {
            throw e;
          }
        });
      logg.debug({result: result});
      logg.info("successes");
    }
  }
}

const checkBond = async () => {
  try {
    let a = await tools.relay.checkBond(bonder.keyPair, bonder.name);
    return a
  } catch(e){
    throw e
  }
}

/* ************************************************************************** */
/* Backoff for proposing a header */

/* Given an event and a bonder decide whether this bonder is supposed to
 * relay (propose) this event.
 *
 * This is to avoid to flood Chainweb blocks with propose txs. Only a small
 * number of bonders is allowed to propose the event at any given time. This is
 * to avoid (1) blocks getting flooded and (2) a large number of failing txs.
 *
 * TODO: we should ensure that each bonder has a change to propose each event
 * eventually. This can be done by computing the set of bonders based on:
 *
 * 1. the hash of the event
 * 2. the minimum pact block height (or time?) for proposing the event
 * 3. the bonder account
 *
 * Thus we can keep the set of bonders small in the beginning, yet make sure
 * that all blocks get proposed even if bonders aren't available.
 */

/* Collaborative approach to reduce contention:
 *
 * delay in seconds
 */
let delay = (blockHash) => {
  const relevantBits = 4; // 1 out of 16
  const increment = 30; // seconds
  const jitter = Math.random() * 0.5 + 0.75; // [0.75, 1.25]

  const pk = Pact.crypto.hexToBin(bonder.keyPair.publicKey);
  const hash = Pact.crypto.hexToBin(blockHash.substr(2));
  const p = Math.clz32(pk[0] ^ hash[0]);

  return Math.max(0, (relevantBits - p)) * increment * jitter;
}

/* ************************************************************************** */
/* Module export */

module.exports = {
  tools: tools,
  proposals: proposals,
  endorsement: endorsement,
  checkBond: checkBond,
  bonder: bonder,
  // internal, for testing
  // delay: delay,
  // lockupEvents: lockupEvents,
  // eventToProposal: eventToProposal,
  // contract: contract,
};

