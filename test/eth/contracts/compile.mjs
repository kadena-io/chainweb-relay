/* requires: 
 * npm install --save-dev @openzepplin/contracts
 */

import hre from "hardhat";

console.log("compiling")
await hre.run("compile");
console.log("compiled")