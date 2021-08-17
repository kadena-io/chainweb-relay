'use strict';

import Web3 from "web3";
import config from "../../Config.mjs";

/* ************************************************************************** */
/* Config */

const eth_url = config.ETH_URL;

/* ************************************************************************** */
/* Initialize Web3 */

export function initProvider (logger) {

  const logg = logger.child({ topic: "provider" });

  const opts = {
    reconnect: {
      auto: false,
      delay: 1000,
      maxAttempts: 2,
    },
  };

  const provider = new Web3.providers.WebsocketProvider(eth_url, opts);

  if (!provider) {
    const msg = "ERROR: provider not available";
    logg.error(msg);
    throw new Error(msg);
  }

  provider.closed_ = new Promise(resolve =>
    provider.on('close', () => {
      logg.info(`provider ${eth_url} closed`);
      resolve();
    })
  );

  provider.connected_ = new Promise(resolve =>
    provider.on('connect', () => {
      logg.info(`provider ${eth_url} connected`);
      resolve();
    })
  );

  provider.errored_ = new Promise(resolve =>
    provider.on('error', e => {
      provider.disconnect();
      logg.error(`provider error for ${eth_url}`, e);
      resolve(e);
    })
  );

  return provider;
}

export function initWeb3 (logger) {
  const logg = logger.child({ topic: "web3" });
  const provider = initProvider(logg);
  const web3 = new Web3(provider);
  web3.close = async () => {
    provider.disconnect();
    provider.connection._client.abort();
    await provider.closed_;
  }
  return web3;
}

/* ************************************************************************** */
/* Query Blocks form the Blockchain */

export class EthGetError extends Error {
  constructor(msg, expected, actual) {
    super(msg);
    this.expected = expected;
    this.actual = actual;
  }
}

/* Fetch an ethereum block header either by hash.
 *
 * Throws an exception if the header doesn't exist or is removed.
 */
export const getHeaderByHash = async (web3, hash) => {
  const hdr = await web3.eth.getBlock(hash);
  if (! hdr) {
    throw new EthGetError("header does not exist", {hash : hash});
  } else if (hdr.removed) {
    throw new EthGetError("header got removed", {
      number: hdr.number,
      hash: hash,
    });
  } else if (hdr.hash !== hash) {
    throw new EthGetError("Got header with wrong hash", {
      number: hdr.number,
      hash: hash,
    }, {
      hash: hdr.hash,
    });
  } else {
    return hdr;
  }
}

export const getHeaderByNumber = async (web3, number) => {
  const hdr = await web3.eth.getBlock(number);
  if (! hdr) {
    throw new EthGetError("header does not exist", {
      number: number,
    });
  } else if (hdr.removed) {
    throw new EthGetError("header got removed", {
      number: number,
      hash: hdr.hash,
    });
  } else if (hdr.number !== number) {
    throw new EthGetError("Got header with wrong number", {
      number: number,
      hash: hdr.hash,
    }, {
      number: hdr.number,
    });
  } else {
    return hdr;
  }
}

