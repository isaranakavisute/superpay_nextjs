/** Fresh, practically unique order id for the demo page: prefix-yymmddHHMMSS-XXXX (seconds + 4 random characters). */
export const newId = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(2, 19).replace(/[-:T]/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0")}`;
