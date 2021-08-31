import chainweb from "chainweb";
import Pact from "pact-lang-api";

import LockupContract from "./eth/LockupContract.mjs";
import config from "../Config.mjs";
import * as tools from "./PactTools.mjs";

/* ************************************************************************** */
/* Utils */

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ************************************************************************** */
/* Initialize Pact API Provider */

const bonder = {
  keyPair: Pact.crypto.restoreKeyPairFromSecretKey(config.PACT_PRIVATE_KEY),
  name: config.BOND_NAME,
}

/* ************************************************************************** */
/* Proposals */

const eventToProposal = async (confirmation, depth, e) => {
  const block = await confirmation.confirmedBlock (e.blockNumber, depth, e.blockHash);
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

const proposals = (logger, web3, confirmation) => {
  logger.info("Starting propose...")

  const contract = new LockupContract(web3, config.ETH_CONTRACT_ADDR, config.ETH_LOCKUP_PUBLIC_KEY);

  let current = null;
  const events = contract.lockupEvents();
  events.on('data', async d => {
    const logg = logger.child({ blockNumber: d.blockNumber, blockHash: d.blockHash })
    if (d.removed) {
      logg.debug("skip removed event");
    } else if (current !== null && d.blockNumber <= current) {
      logg.debug({ current: current }, "skip non-current event");
    } else {
      current = d.blockNumber;
      const depth = Math.min(2, Math.round(config.ETH_CONFIRMATION_DEPTH / 2));
      logg.debug(`awaiting confirmation depth ${depth} for lockup event at height ${current}`);
      const p = await eventToProposal(confirmation, depth, d);
      const s = delay(d.blockHash);
      logg.debug(`waiting ${s}s`);
      await timeout(s * 1000);
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
      if (e.result?.error?.message === 'Duplicate proposal') {
        return true;
      } else if (e.result?.error?.message === 'Already active proposal') {
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
      .then(() => logg.info("successes"))
      .catch(e => {
        const msg = e.result?.error?.message;
        if (e.result?.error?.message === 'Duplicate proposal') {
          logg.warn({warning: msg}, "proposal failed");
        } else if (msg === 'Already active proposal') {
          logg.warn({warning: msg}, "proposal failed");
        } else if (e instanceof tools.TimeoutError) {
          logg.warn({warning: e}, "failed to confirm that proposal was successful");
        } else {
          throw e;
        }
      });
    logg.debug({result: result});
  }
}

/* ************************************************************************** */
/* Endorsement */

const endorsement = async (logger, confirmation) => {
  logger.info("Starting endorse...");

  // Check recentEvents
  const recentEvents = await chainweb.event.recent(
      config.PACT_CHAIN_ID,
      config.PACT_CONFIRM_DEPTH,
      config.PACT_RECENT_BLOCKS,
      config.PACT_NETWORK_ID,
      config.PACT_P2P_SERVER
  );
  const filteredEvents = recentEvents.filter(e => e.name === "PROPOSE" && e.params[3].includes(bonder.name));
  logger.info(filteredEvents.map(e => e.params[1]), `Chainweb Events to endorse in the last ${config.PACT_RECENT_BLOCKS} blocks`);
  filteredEvents.forEach(async e => processEndorseEvent(logger, confirmation, e))

  // Listens to event stream
  chainweb.event.stream(config.PACT_CONFIRM_DEPTH, [config.PACT_CHAIN_ID], async e => {
    if (e.name === "PROPOSE" && e.params[3].includes(bonder.name)) {
      logger.debug(e, "Got PROPOSE event");
      processEndorseEvent(logger, confirmation, e);
    }
  }, config.PACT_NETWORK_ID, config.PACT_P2P_SERVER)
}

const processEndorseEvent = async (logger, confirmation, e) => {
  logger.debug({event: e.params[1]}, "Chainweb propose event");
  const d = {blockNumber: e.params[0].int, blockHash: e.params[1]};
  const logg = logger.child({ blockNumber: d.blockNumber, blockHash: d.blockHash })
  const depth = config.ETH_CONFIRMATION_DEPTH;
  let blockHeader = await eventToProposal(confirmation, depth, d);
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
          } else if (e instanceof tools.TimeoutError) {
            logg.warn({warning: e}, "failed to confirm that endorsement was successful");
          } else {
            throw e;
          }
        });
      logg.debug({result: result});
      logg.info("successes");
    }
  }
}

/* ************************************************************************** */
/* Check Bond */

const checkBond = async () => {
  try {
  return await tools.relay.checkBond(bonder.keyPair, bonder.name);
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
  const relevantBits = 5; // 1 out of 16
  const increment = 45; // seconds
  const jitter = increment * (Math.random() * 0.6 - 0.3); // increment * [-0.3, 0.3]

  const pk = new Uint32Array(Pact.crypto.hexToBin(bonder.keyPair.publicKey.substring(0,8)).buffer);
  const hash = new Uint32Array(Pact.crypto.hexToBin(blockHash.substring(2,10)).buffer);
  const p = Math.clz32(((pk[0] ^ hash[0]) * 68718952447) % 2**(32-1));
  // console.log(pk, hash, (((pk[0] ^ hash[0]) * 68718952447) % 2**(32-1)), p, jitter)

  return Math.max(0, Math.max(0, (relevantBits - p)) * increment + jitter);
}

/* ************************************************************************** */
/* Module export */

export {
  proposals,
  endorsement,
  checkBond,
  bonder,
  // for testing:
  delay,
}
