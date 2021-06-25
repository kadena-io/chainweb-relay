var a = require("./relay");

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
