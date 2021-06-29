const pact = require("pact-lang-api");
const config = require("../config");

/* ************************************************************************** */
/* Utils */

const objMap = (obj, f) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, f(v)]));

/* ************************************************************************** */
/* Pact Utils */

/* Creation time for a transaction */
const creationTime = () => Math.round((new Date).getTime()/1000)-180

const meta = (sender) => pact.lang.mkMeta(
  sender ?? "",
  config.PACT_CHAIN_ID,
  config.PACT_GAS_PRICE,
  config.PACT_GAS_LIMIT,
  creationTime(),
  config.PACT_TTL
);

const pactResult = (resp) => {
  if (resp.result && resp.result.status === 'success') {
    return resp.result.data;
  } else {
    throw resp;
  }
}

/**
 * Send pact with an Command Object.
 *
 * @param cmd the command Object
 *
 * @returns request key
 * @throws if the call fails.
 *
 */
const sendPact = async (cmd) => {
  const resp = await pact.fetch.send(cmd, config.PACT_URL);
  const reqKeys = resp.requestKeys;
  if (reqKeys) {
    return reqKeys[0];
  } else {
    throw resp;
  }
}

/**
 * Locally call pact with an Command Object.
 *
 * @param cmd the command Object
 *
 * @returns data of the result of the call.
 * @throws if the call fails.
 *
 */
const localPact = async (cmd) =>
    pactResult(await pact.fetch.local(cmd, config.PACT_URL));

/**
 * Call pact with an Command Object and awaits the transaction result.
 *
 * @param cmd the command Object
 * @param local whether this command is a local call that doesn't change the state of the chain. (default: true)
 *
 * @returns data of the result of the call.
 * @throws if the call fails.
 *
 */
const awaitPact = async (cmd, local) => {
  if (typeof local === 'undefined' || local) {
    return await localPact(cmd);
  } else {
    const reqKey = await sendPact(cmd);
    return await awaitTx(reqKey);
  }
}

const awaitTx = async (reqKey) => {
  const resp = await poll({ requestKeys: [reqKey] }, config.PACT_URL);
  return pactResult(resp[reqKey]);
}

const pollTxs = async (reqKeys) => {
  const resp = await pact.fetch.poll(reqKeys, config.PACT_URL);
  return objMap(resp, v => pactResult(v));
}

const poll = async (reqKey, apiHost, maxCount=300) => {
  let repeat = true;
  let count = 0;
  while (repeat) {
    const result = await pact.fetch.poll(reqKey, apiHost)
    if (result[reqKey.requestKeys[0]]) {
      return result;
    }
    await wait();
    count++;
    if (count > maxCount) {
      repeat = false;
      return result;
    }
  }
  return 'Server unresponsive'
}

async function wait(ms = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/* ************************************************************************** */
/* Relay Contract Utils */

/**
 * Base pact command template
 *
 * @param keyPair can be `undefined` for local calls.
 * @param sender the gas payer for the call. Not required for local calls.
 *
 * @returns a command Object that initialized with values from the configuration.
 *
 * The resulting cmd Object does not contain 'pactCode'.
 *
 */
const mkCmd = (keyPair, sender) => {
  if (!keyPair) {
    keyPair = pact.crypto.genKeyPair();
  }
  return {
    keyPairs: [
      {
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
      }
    ],
    meta: meta(sender),
    networkId: config.PACT_NETWORK_ID,
  };
};

/* ************************************************************************** */
/* Capabilities */

// Requires that the sender is:
const gasCap = () => pact.lang.mkCap("Gas Payer", "gas", "coin.GAS", []);

const poolBondCap = (bond) =>
  pact.lang.mkCap("Bonder", "Bond", `${config.PACT_POOL_MODULE}.BONDER`, [bond])

const relayBondCap = (bond) =>
  pact.lang.mkCap("Bonder", "Bond", `${config.PACT_MODULE}.BONDER`, [bond])

const relayGasCap = () => pact.lang.mkCap(
  "Gas Station",
  "free gas",
  `${config.PACT_RELAY_GAS_STATION}.GAS_PAYER`,
  ["free-gas", {int: 1}, 1.0]
);

const transferCap = (fromAcc, toAcc, amount) => {
  args = [
    fromAcc,
    toAcc,
    amount
  ];
  return pact.lang.mkCap("Coin Transfer", "coin transfer gas", "coin.TRANSFER", args);
}

/* ************************************************************************** */
/* Pool */

const RELAY_BANK = "relay-bank";
const RELAY_GAS_STATION_ACCOUNT = "relay-free-gas";

/**
 * Get State of Pool. (Can be
 */
const poolGet = async () => {
  const cmd = mkCmd();
  cmd.pactCode = `(${config.PACT_POOL_MODULE}.get-pool ${config.PACT_MODULE}.POOL)`;
  return await localPact(cmd);
};

/**
 * Create a new Bond
 *
 * @param keyPair The key pair of that governs the account that is used to fund the bond as well as
 *   the bond itself
 * @param account The account from where the bond is funded. The resulting bond name is derived from
 *  the account name and the current data.
 * @param ammount the amount that is authorized for transfer into the bond. The value is determined by the pool.
 * @param local whether this is local call (doesn't change the state of chain) (default: true)
 *
 * @returns
 *  the bond name in the data property of the result.
 *
 * The amount is determined by the pool and ist fixed. It is included as a parameter so that the
 * bonder explicitely acknoledges and confirms the transfer of the respective amount.
 *
 * This function also generates events for 'TRANSFER', 'BOND', and 'UPDATE'.
 *
 * TODO: Is it possible to use different keys for funding the bond and for different keys?
 *   governing the bond?
 */
const relayNewBond = async (keyPair, account, amount, local) => {
  const cmd = mkCmd(keyPair, RELAY_GAS_STATION_ACCOUNT);
  cmd.keyPairs[0].clist = [
    relayGasCap().cap,
    transferCap(account, RELAY_BANK, amount).cap,
  ];
  cmd.pactCode = `(${config.PACT_POOL_MODULE}.new-bond ${config.PACT_MODULE}.POOL (read-msg 'account) (read-keyset 'ks))`,
  cmd.envData = {
    account: account,
    ks: {
      pred: "keys-any",
      keys: [keyPair.publicKey],
    }
  };
  return await awaitPact(cmd, local);
}

/* ************************************************************************** */
/* Relay */

/**
 * Propose a header to the relay.
 */
const relayPropose = async (keyPair, bond, proposal, local) => {
  const cmd = mkCmd(keyPair, RELAY_GAS_STATION_ACCOUNT);
  cmd.envData = {
    header: {
      hash: proposal.hash,
      number: {int: proposal.number},
      'receipts-root': proposal['receipts-root']
    },
    bond: bond,
  };
  cmd.keyPairs[0].clist = [
    relayGasCap().cap,
    relayBondCap(bond).cap,
  ]
  cmd.pactCode = `(${config.PACT_MODULE}.propose (read-msg 'header) (read-msg 'bond))`;
  // console.log("call pact:", cmd.pactCode);
  // console.log("envData.header", cmd.envData.header);
  // console.log("envData.bond", cmd.envData.bond);
  // console.log("caps", cmd.keyPairs[0].clist);
  // console.log("meta", cmd.meta);
  return await awaitPact(cmd, local);
}

/**
 * Check Bond
 */
const relayCheckBond = async (keyPair, bond) => {
  const cmd = mkCmd(keyPair, RELAY_GAS_STATION_ACCOUNT);
  cmd.envData = {
    bond: bond
  }
  cmd.pactCode = `(enforce-guard
                    (at 'guard
                      (${config.PACT_POOL_MODULE}.get-active-bond (read-msg 'bond))))`;
  return await localPact(cmd);
}

/**
 * Renew Bond
 */
const relayRenewBond = async (keyPair, bond, local) => {
  const cmd = mkCmd(keyPair, RELAY_GAS_STATION_ACCOUNT);
  cmd.envData = {
    bond: bond
  }
  cmd.keyPairs[0].clist = [
    relayGasCap().cap,
    poolBondCap(bond).cap,
  ]
  cmd.pactCode = `(${config.PACT_POOL_MODULE}.renew (read-msg 'bond))`;
  // console.log("cmd", cmd);
  // console.log("caps", cmd.keyPairs[0].clist);
  return await awaitPact(cmd, local);
}

/**
 * Endorse a header to the relay.
 */
const relayEndorse = async (keyPair, bond, proposal, local) => {
  const cmd = mkCmd(keyPair, RELAY_GAS_STATION_ACCOUNT);
  cmd.envData = {
    header: {
      hash: proposal.hash,
      number: {int: proposal.number},
      'receipts-root': proposal['receipts-root']
    },
    bond: bond,
  };
  cmd.keyPairs[0].clist = [
    relayGasCap().cap,
    relayBondCap(bond).cap,
  ]
  cmd.pactCode = `(${config.PACT_MODULE}.endorse (read-msg 'header) (read-msg 'bond))`
  // console.log("call pact:", cmd.pactCode);
  // console.log("envData", cmd.envData.header);
  // console.log("caps", cmd.keyPairs[0].clist);
  return await awaitPact(cmd, local);
}


const relayValidate = async (keyPair, proposal) => {
  const cmd = mkCmd(keyPair, RELAY_GAS_STATION_ACCOUNT);
  cmd.envData = {
    header: {
      hash: proposal.hash,
      number: {int: proposal.number},
      'receipts-root': proposal['receipts-root']
    },
  };
  cmd.pactCode = `(${config.PACT_MODULE}.validate (read-msg 'header))`;
  return await localPact(cmd);
}

/* ************************************************************************** */

module.exports = {
  mkCmd: mkCmd,
  call: awaitPact,
  local: localPact,
  send: sendPact,
  awaitTx: awaitTx,
  pool: {
    get: poolGet,
  },
  relay: {
    propose: relayPropose,
    endorse: relayEndorse,
    validate: relayValidate,
    newBond: relayNewBond,
    checkBond: relayCheckBond,
    renew: relayRenewBond,
  },
  capabilities: {
    gas: gasCap,
    poolBond: poolBondCap,
    relayBond: relayBondCap,
    transfer: transferCap,
    relayGas: relayGasCap,
  }
};
