var t = require("./tst");
var config = require("../config");

const lockupAddress = config.ETH_LOCKUP_PUBLIC_KEY;

let i = 0;
let timer = setInterval(() =>
  {
    t.methods.transfer(lockupAddress, 1)
      .then(() => console.log(`transfer: ${i++}`))
      .catch(e => console.error("transfer failed: ", e));
  }, 12000);

