const Web3 = require("web3")
const Pact = require("pact-lang-api");
const config = require("./config");
const tools = require("./src/pact-tools");
const chainweb = require("chainweb.js")
/* ************************************************************************** */
/* ERC-20 contract Addresses */

const usdtMainnet = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const usdtRopsten = '0x6ee856ae55b6e1a249f04cd3b947141bc146273c';
const tstContractAddr = '0x722dd3f80bac40c951b51bdd28dd19d435762180';

/* ************************************************************************** */
/* Initialize Pact API Provider */

const bonder = {
  keyPair: config.PACT_PRIVATE_KEY.length===64 ? Pact.crypto.restoreKeyPairFromSecretKey(config.PACT_PRIVATE_KEY): undefined,
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
  contract.once('Transfer', { filter: { "_to" : config.ETH_LOCKUP_ADDR } }, cb);
}

/* Lockup Events Emitter for a contract and a lockup accont
 */
const lockupEvents = () =>
  contract.events.Transfer({filter: {"_to": config.ETH_LOCKUP_ADDR}});

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

/* ************************************************************************** */
/* Proposals */

async function eventToProposal (e) {
  const block = await awaitBlock (e.blockNumber, e.blockHash);
  if (block) {
    console.log(`got proposed block ${e.blockNumber} - ${e.blockHash}`);
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
  console.log("Starting propose...")
  let current = null;
  const events = lockupEvents();
  events.on('data', d => {
    if (d.removed) {
      console.log(`skip removed event ${d.blockNumber} (current: ${current})`);
    } else if (current !== null && d.blockNumber <= current) {
      console.log(`skip non-current event ${d.blockNumber} (current: ${current})`);
    } else {
      current = d.blockNumber;
      s = delay(d.blockHash);
      console.log(`wait ${s}s on ${d.blockNumber} - ${d.blockHash}`);
      setTimeout(() => eventToProposal(d).then(p => submitPropose(p)), s * 1000);
    }
  });
  return events;
}


// We could be more fancy and listen to propose events on the
// Kadena side and drop the proposal if it is already submitted.
//
const submitPropose = async (proposal) => {
  // check that proposal hasn't been submitted yet
  const exists = await tools.relay.propose(bonder.keyPair, config.BOND_NAME, proposal)
    .then(r => false)
    .catch((e) => {
      // TODO: distinguish between exiting and other failures:
      console.log(`failed on local: ${proposal.number} - ${proposal.hash}: ${JSON.stringify(e.result.error)}`);
      return true;
    });
  if (!exists) {
    console.log(`propose ${proposal.number} - ${proposal.hash}`);
    try {
      const reqKeys = await tools.relay.propose(bonder.keyPair, config.BOND_NAME, proposal, false);
      console.log(`got request keys for ${proposal.number} - ${proposal.hash}: ${reqKeys}`);
      try {
        const result = await tools.awaitTx(reqKeys[0]);
        console.log(`done proposing ${proposal.number} - ${proposal.hash}: ${result}`);
      } catch (e) {
        console.log(`failed to propose ${proposal.number} - ${proposal.hash}: ${JSON.stringify(e.result.error)}`);
      }
    } catch (e) {
      console.log(`failed on send: ${proposal.number} - ${proposal.hash}: ${JSON.stringify(e)}`);
    }
  } else {
    console.log(`skip existing ${proposal.number} - ${proposal.hash}`);
  }
}

/* ************************************************************************** */
/* Endorsement */


const endorsement = async () => {
  console.log("Starting endorse...")
  //Check recentEvents
  let recentEvents = await chainweb.event.recent(config.PACT_CHAIN_ID, config.PACT_CONFIRM_DEPTH, config.PACT_RECENT_BLOCKS, config.PACT_NETWORK_ID, `https://${config.PACT_SERVER}`);
  let filteredEvents = recentEvents.filter(e => e.name === "PROPOSE" && e.params[3].includes(bonder.name));
  console.log(`Chainweb Events to endorse in the last ${config.PACT_RECENT_BLOCKS} blocks`, filteredEvents.map(e => e.params[1]))
  filteredEvents.forEach(async e => {
    let blockHeader = await eventToProposal({blockNumber: e.params[0].int, blockHash:e.params[1]})
    //Check if endorses include the bonder
    if (e.params[3].includes(bonder.name)) {
      submitEndorse(blockHeader);
    }
  })
  //Listens to event stream
  chainweb.event.stream(config.PACT_CONFIRM_DEPTH, [config.PACT_CHAIN_ID], async e => {
   if (e.name === "PROPOSE" && e.params[3].includes(bonder.name)){
     console.log("Chainweb propose event received:", e.params[1])
     //Fetch block header
     let blockHeader = await eventToProposal({blockNumber: e.params[0].int, blockHash:e.params[1]})
     submitEndorse(blockHeader);
   }
 }, config.PACT_NETWORK_ID, `https://${config.PACT_SERVER}`)
}

const submitEndorse = async (proposal) => {
  // check that proposal hasn't been validated yet
  const validated = await tools.relay.validate(bonder.keyPair, proposal, true);
  if (validated.result.status === "failure"){
    const exists = await tools.relay.endorse(bonder.keyPair, config.BOND_NAME, proposal)
      .then(r => false)
      .catch((e) => {
        // TODO: distinguish between exiting and other failures:
        console.log(`failed on local: ${proposal.number} - ${proposal.hash}: ${JSON.stringify(e.result.error.message)}`);
        return true;
      });
    if (!exists){
      console.log(`endorse ${proposal.number} - ${proposal.hash}`);
      try {
        const reqKeys = await tools.relay.endorse(bonder.keyPair, bonder.name, proposal, false);
        console.log(`got request keys for ${proposal.number} - ${proposal.hash}: ${reqKeys}`);
        try {
          const result = await tools.awaitTx(reqKeys[0]);
          console.log(`done endorsing ${proposal.number} - ${proposal.hash}: ${JSON.stringify(result)}`);
        } catch (e) {
          console.log(`failed to endorse ${proposal.number} - ${proposal.hash}: ${JSON.stringify(e.result.error)}`);
        }
      } catch (e) {
        console.log(`failed on send: ${proposal.number} - ${proposal.hash}: ${JSON.stringify(e)}`);
      }
    }
  } else {
    console.log(`skip existing ${proposal.number} - ${proposal.hash}`);
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
  // internal, for testing
  delay: delay,
  lockupEvents: lockupEvents,
  eventToProposal: eventToProposal,
  contract: contract,
};
