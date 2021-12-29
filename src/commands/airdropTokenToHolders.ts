import { Logger } from "../lib/types/Logger";

type AirdropTokenToHoldersInput = {
  snapshotFile: string;
  rpc: string;
  solanaKeypair: string;
  ogHoldersFile: string;
  tokenMint: string;
};

export const createAirdropTokenToHoldersCommand =
  (logger: Logger) => async (opts: AirdropTokenToHoldersInput) => {};
