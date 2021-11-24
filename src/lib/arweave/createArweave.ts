import Arweave from "arweave";

export const createArweave = () =>
  Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
    timeout: 20000,
    logging: false,
  });
