var t = require("./tst");
var config = require("../config");

const lockupAddress = config.ETH_LOCKUP_PUBLIC_KEY;

const INTERVAL=30000;

const lockup = () => t.methods.transfer(lockupAddress, 1)
    .then(() => console.log(`transfer: ${i++}`))
    .catch(e => console.error("transfer failed: ", e));

let i = 0;
lockup();
const timer = setInterval(() => lockup(), INTERVAL);

