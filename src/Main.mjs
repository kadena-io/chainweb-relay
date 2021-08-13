import Pino from "pino";
import { initWeb3 } from "./eth/Utils.mjs";
import Confirmation from "./eth/Confirmation.mjs";
import * as relay from "./Relay.mjs";
import config from "../Config.mjs";

/* ************************************************************************** */
/* Logging */

// in production set `{level: warn, prettyPrint: false}`
// const logger = require('pino')({level: config.LOG_LEVEL, prettyPrint: true});
const logger = Pino({level: config.LOG_LEVEL, prettyPrint: true});

const proposeLogger = logger.child({ topic: "propose" });
const endorseLogger = logger.child({ topic: "endorse" });

/* ************************************************************************** */
/* Install Signal Handler */

process.on('SIGINT', () => {
  process.exit(0)
});

/* ************************************************************************** */
/* Print App Info */

const appInfo = () => {
    logger.info("Starting Relay App");
    logger.info(`ETH API URI: ${config.ETH_URL}`);
    logger.info(`Pact API URI: ${config.PACT_URL}`);
    logger.info(`ETH contract: ${config.ETH_CONTRACT_ADDR}`);
    logger.info(`ETH lockup account: ${config.ETH_LOCKUP_PUBLIC_KEY}`);
    logger.info(`Bonder public key: ${relay.bonder.keyPair.publicKey}`);
    logger.info(`Bond name: ${relay.bonder.name}`);
}

/* ************************************************************************** */
/* Intialize web3 */

const web3 = initWeb3(logger);
const confirmation = new Confirmation(web3);

/* ************************************************************************** */
/* Main */

const main = async () => {

  try {
    await relay.checkBond()
  } catch (e) {
    if (e.result) {
      logger.error("FAILURE! Check your key or the bond name: ", e.result.error.message)
    } else {
      logger.error(e);
    }
    throw e;
  };

  try {
    relay.proposals(proposeLogger, web3, confirmation);
    relay.endorsement(endorseLogger, confirmation);
  } catch(e){
    logger.error(e);
  }
}

appInfo();
main();
