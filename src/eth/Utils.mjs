import Web3 from "web3";
import config from "../../Config.mjs";

/* ************************************************************************** */
/* Config */

const eth_url = config.ETH_URL;

/* ************************************************************************** */
/* Test Logger */

export class ConsoleLogger {
  constructor(opts) { this.topic = opts?.topic ?? ""; }
  child (opts) { return new ConsoleLogger(opts); }
  debug (msg) { console.debug(this.topic, msg); }
  info (msg) { console.info(this.topic, msg); }
  warn (msg) { console.warn(this.topci, msg); }
  error (msg) { console.error(this.topic, msg); }
}

/* ************************************************************************** */
/* Initialize Web3 */

export function initProvider (logger) {

  const logg = logger.child({ topic: "provider" });
  const provider = new Web3.providers.WebsocketProvider(eth_url);

  if (!provider) {
    const msg = "ERROR: provider not available";
    logg.error(msg);
    throw new Error(msg);
  }

  provider.closed = new Promise(resolve =>
    provider.on('close', () => resolve())
  );

  provider.on("connect", () => logg.info(`provider ${eth_url} connected`));
  provider.on('error', e => logg.warn(`provider error for ${eth_url}`, e));
  return provider;
}

export function initWeb3 (logger) {
  const logg = logger.child({ topic: "web3" });
  const provider = initProvider(logg);
  const web3 = new Web3(provider);
  web3.close = async () => {
    provider.disconnect();
    await provider.closed;
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

