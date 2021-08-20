
/* ************************************************************************** */
/* Miscealleous Test Utils */

export const xor = (a,b) => a ? !b : b;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const timeout = (ms, p) => {
    return Promise.race([
      sleep(ms).then(() => { throw new Error(`Timeout: promised rejected after ${ms}ms`) }),
      p
    ]);
};

export class ConsoleLogger {
  constructor(opts) { this.topic = opts?.topic ?? ""; }
  child (opts) { return new ConsoleLogger(opts); }
  debug (msg) { console.debug(this.topic, msg); }
  info (msg) { console.info(this.topic, msg); }
  warn (msg) { console.warn(this.topic, msg); }
  error (msg) { console.error(this.topic, msg); }
}
