var t = require("./tst");

let i = 0;
let timer = setInterval(() => {
  t.methods.transfer(t.accounts.lockup.address, 1).then(() => console.log(`transfer: ${i++}`));
}  , 12000);
