#!/usr/bin/env node
import config from "../Config.mjs";
import * as t from "./Tst.mjs";

const lockupAddress = config.ETH_LOCKUP_PUBLIC_KEY;

const INTERVAL=120000;

// TODO add retry logic
const lockup = () => t.methods.transfer(lockupAddress, 1)
    .then(() => console.log(`completed transfer: ${i++}`))
    .catch(e => {
        console.error("transfer failed: ", e)

        // let the app crash so that we get a clean restart.
        throw e
    });

let i = 0;
lockup();
const timer = setInterval(() => {
    console.log(`starting transfer ${i}`);
    lockup()
}, INTERVAL);
