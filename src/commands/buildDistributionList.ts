import fs from "fs/promises";
import { Logger } from "../lib/types/Logger";
import { Chance } from "chance";

type PubkeyString = string;

type CMV1HolderSnapshotItem = {
  associatedTokenAddress: string;
  metadataAccount: string;
  mintAccount: string;
  ownerWallet: string;
};

type AirdropTokenToHoldersInput = {
  snapshotFile: string;
  ogHoldersFile: string;
  supply: string;
};

export const createBuildDistributionList =
  (logger: Logger) => async (opts: AirdropTokenToHoldersInput) => {
    const supply = parseInt(opts.supply);
    const uniqueHoldersArray = JSON.parse(
      await fs.readFile(opts.ogHoldersFile, "utf-8")
    ) as PubkeyString[]; // PubKeys
    const holderSnapshot = JSON.parse(
      await fs.readFile(opts.snapshotFile, "utf-8")
    ) as CMV1HolderSnapshotItem[];
    // Lets say we have 3500
  };
