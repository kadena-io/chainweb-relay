import Web3 from 'web3';

/* ************************************************************************** */
/* Initialize Ganache */

// I would prefer to just use hardhat, but Hardhat has a bug that prevents 
// subscriptions from working. I also was not able to get hardhat-ganache to 
// work.
//
// So, for now, we use harthad only for compilation. We use ganache-core for
// everything else (via ganache.provider()).

import ganache from "ganache-core";

/* ************************************************************************** */
/* Web3 */

export const web3 = new Web3(ganache.provider());
// const web3 = hre.web3;

// This is asynchronouos, but should be fine for testing
export const accounts = await web3.eth.getAccounts();

export async function advanceBlock(n = 1) {
  for (let i = 0; i < n; ++i) {
    await new Promise((resolve, reject) => {
      const arg = {
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime(),
      }
      web3.currentProvider.send(arg, (err, res) => err ? reject(err) : resolve(res));
    });
  }
};
