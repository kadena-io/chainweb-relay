var a = require("./relay");
var process = require('process')

process.on('SIGINT', () => {
  process.exit(0)
});

const main = async () => {
  try {
    await a.checkBond();
    var p = a.proposals();
    var en = a.endorsement()
  } catch(e){
    console.error("FAILURE! Check your key or the bond name: ", e.result.error.message)
  }
}

main();
