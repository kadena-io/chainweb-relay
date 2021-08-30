#!/usr/bin/env node
import config from "../Config.mjs";
import * as t from "./Tst.mjs";

const lockupAddress = config.ETH_LOCKUP_PUBLIC_KEY;

const INTERVAL=120000;

let i = 0;

// TODO add retry logic
const lockup = (c) => t.methods.transfer(lockupAddress, 1)
    .then(() => console.log(`completed transfer: ${c}`))
    .catch(e => {
        console.error("transfer failed: ", e)

        // let the app crash so that we get a clean restart.
        throw e
    });

lockup(i);
const timer = setInterval(() => {
    console.log(`starting transfer ${i}`);
    lockup(++i);
}, INTERVAL);
