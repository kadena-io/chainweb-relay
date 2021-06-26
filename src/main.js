var a = require("./relay");
var process = require('process')
var config = require('../config')

process.on('SIGINT', () => {
  process.exit(0)
});

const main = async () => {
  try {
    await a.checkBond();
    var p = a.proposals();
    var en = a.endorsement()
  } catch(e){
    if (e.result) {
      console.error("FAILURE! Check your key or the bond name: ", e.result.error.message)
    } else {
      console.error("FAILURE: ", e);
    }
  }
}

const appInfo = () => {
    console.log("Starting Relay App");
    console.log(`ETH API URI: ${config.ETH_URL}`);
    console.log(`Pact API URI: ${config.PACT_URL}`);
    console.log(`ETH contract: ${config.ETH_CONTRACT_ADDR}`);
    console.log(`ETH lockup account: ${config.ETH_LOCKUP_PUBLIC_KEY}`);
    console.log(`Bonder public key: ${a.bonder.keyPair.publicKey}`);
    console.log(`Bond name: ${a.bonder.name}`);
}

appInfo();
main();
