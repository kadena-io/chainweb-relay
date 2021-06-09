const pact = require("pact-lang-api");
const tools = require("./pact-tools");

/* ************************************************************************** */
/* coin contract tools

/**
 * Account balance
 *
 */
const getBalance = async (accountName) => {
  const cmd = tools.mkCmd();
  cmd.pactCode = `(coin.get-balance "${accountName}")`
  return await tools.call(cmd);
}

/**
 * Account details
 *
 */
const details = async (accountName) => {
  const keyPair = pact.crypto.genKeyPair();
  const cmd = tools.mkCmd(keyPair, accountName);
  cmd.pactCode = `(coin.details "${accountName}")`
  return await tools.call(cmd);
}

/**
 * transfer
 *
 */
const transfer = async (
  tokenAddress,
  fromAcct,
  keyPair,
  toAcct,
  amount,
  chainId,
  guard,
  local
) => {
  const cmd = tools.mkCmd(keyPair, fromAcct);
  cmd.envData = { "recp-ks": guard };
  cmd.pactCode =  `(${tokenAddress}.transfer-create "${fromAcct}" "${toAcct}" (read-keyset "recp-ks") ${amount})`,
  cmd.keyPairs[0].clist = [
    transferCap(account, RELAY_BANK, amount).cap,
    gasCap.cap().cap,
  ];
  return await tools.call(cmd);
}

/**
 * found from Faucet (testnet)
 *
 */
const fund = async (kp) => {
  const cmd = tools.mkCmd(kp, kp.publicKey);
  cmd.pactCode = `(user.coin-faucet.request-coin "${kp.publicKey}" 20.0)`;
  cmd.keyPairs[0].clist = [
    tools.capabilities.gas().cap,
    tools.capabilities.transfer("coin-faucet", kp.publicKey, 20).cap
  ];
  return await tools.call(cmd, false);
}


module.exports = {
  getBalance: getBalance,
  transfer: transfer,
  details: details,
  fund: fund,
};

