/*
 * var t = require("./test/tst");
 * var a = require("./index");
 * let i = 0;
 * let timer = setInterval(() => t.methods.transfer(t.accounts.lockup.address, 1).then(() => console.log(`transfer: ${i++}`)), 12000);
 * var p = a.proposals();
 */

let tst = require("./tst");
let relay = require("../index");

async function lockup (i) {
  await t.methods.transfer(t.accounts.lockup.address, 1);
  console.log(`transfer: ${i}`);
  ++i;
}

const p = relay.proposals();

let i = 0;
const timer = setInterval(() => lockup(i++), 12000);

/* ************************************************************************** */
/* faucet */

const fund = async (kp) => {
  const cmd = tools.mkCmd(kp, kp.publicKey);
  cmd.pactCode = `(user.coin-faucet.request-coin "${kp.publicKey}" 20.0)`;
  cmd.keyPair[0].clist = [
    tools.capabilities.gas().cap,
    tools.capabilities.transfer("coin-faucet", kp.publicKey, 20).cap
  ];
  const p = await tools.call(c, false)
  const result = await tools.awaitTx(p.requestKeys[0]);
  coin.getBalance(kp.publicKey)).then(x => console.log(x))
}

/*
code = '(user.coin-faucet.create-and-request-coin '
  + JSON.stringify(_this.state.accountName)
  + ' (read-keyset \'fund-keyset) 10.0)'

envData = {
  "fund-keyset": {
    "pred": _this.state.keysetPredicate,
    "keys": _this.state.publicKeys
  }
}

keyPairs = [
  _extends(
    {},
    _srcAcct.faucetOpKP,
    { clist: { name: "coin.GAS", args: [] } }
  ),
  _extends(
    {},
    _pactLangApi2.default.crypto.genKeyPair(),
    { clist: {
        name: "coin.TRANSFER",
        args: [_srcAcct.faucetAcct, _this.state.accountName, 10.0]
      }
    }
  )
],
*/
