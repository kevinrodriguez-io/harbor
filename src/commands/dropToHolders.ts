import fs from "fs/promises";
import * as Web3 from "@solana/web3.js";
import pLimit from "p-limit";
import retry from "async-retry";
import libPath from "path";

import { Logger } from "../lib/types/Logger";

import { decodeMetadata } from "../lib/metaplex/sdk.js";
import { createArweave } from "../lib/arweave/createArweave.js";
import { uploadNFTToArweave } from "../lib/uploader/nftUploader.js";
import { mintOneNFT } from "../lib/metaboss.js";

type DropToHoldersInput = {
  path: string;
  key: string;
  solanaKeypair: string;
  id: string;
  snapshotFile: string;
  rpc: string;
  threads: string;
  retries: string;
};

type CMHolderListItem = {
  associatedTokenAddress: string;
  metadataAccount: string;
  mintAccount: string;
  ownerWallet: string;
};
function getMintAccount(string: string) {
  const stringArray = string.split("\n");
  return stringArray[1].split(":")[1].trim();
}

export const createDropToHoldersCommand =
  (logger: Logger) =>
  async ({
    solanaKeypair,
    path,
    snapshotFile,
    rpc,
    threads,
    retries: unParsedRetries,
    key: optionsKey,
  }: DropToHoldersInput) => {
    const arweave = createArweave();
    const key = await fs.readFile(optionsKey, "utf8");
    const jwk = JSON.parse(key);

    const limit = pLimit(parseInt(threads));
    const retries = parseInt(unParsedRetries);
    const connection = new Web3.Connection(rpc);
    const snapshotFileContents = await fs.readFile(snapshotFile, "utf8");
    const holdersSnapshot: CMHolderListItem[] =
      JSON.parse(snapshotFileContents);

    const walletAddress = await arweave.wallets.jwkToAddress(jwk);
    const balance = await arweave.wallets.getBalance(walletAddress);

    logger.log(`Arweave Balance: ${balance}`);

    const allPromises: Promise<string>[] = [];
    for (const [
      i,
      { metadataAccount, ownerWallet },
    ] of holdersSnapshot.entries()) {
      const promise = limit(async () =>
        retry(
          async () => {
            const tokenMetadataAccountInfo = await connection.getAccountInfo(
              new Web3.PublicKey(metadataAccount)
            );
            const attachedMetadata = decodeMetadata(
              tokenMetadataAccountInfo!.data
            );
            const number = parseInt(attachedMetadata.data.name.split("#")[1]); // Turns JungleCats #0011 into 11.
            const uri = await uploadNFTToArweave(
              {
                animatedFormat: "none",
                imageFormat: "jpg", // TODO: Try and read .gif or .jpg from metadata to determine imageFormat.
                item: number,
                optionsPath: path,
                pseudoCachePath: "",
              },
              {
                arweave,
                jwk,
                limit,
                logger,
              },
              5,
              false
            );
            const meta = JSON.parse(
              await fs.readFile(
                libPath.resolve(path, `${number}.json`),
                "utf-8"
              )
            );
            const output = await mintOneNFT(
              rpc,
              solanaKeypair,
              ownerWallet,
              "./temp",
              {
                name: meta.name,
                symbol: meta.symbol,
                uri,
                seller_fee_basis_points: meta.seller_fee_basis_points,
                creators: meta.creators.map(
                  (creator: {
                    address: string;
                    verified: boolean;
                    share: number;
                  }) => ({
                    ...creator,
                    verified: false,
                  })
                ),
              }
            );
            logger.log(output);
            const mintAccount = getMintAccount(output);
            return mintAccount;
          },
          {
            retries,
            onRetry: (e, attempt) => {
              logger.error(
                `Failed to mint NFT #${i} (${e}), retry. Attempt: ${attempt}/${retries}`
              );
            },
          }
        )
      );
      allPromises.push(promise);
    }
    const results = await Promise.allSettled(allPromises);
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      logger.error(`${failed.length} of ${holdersSnapshot.length} failed.`);
    } else {
      // Write all successful promises mints to a file.
      const successfulMints = results.filter(
        (result) => result.status === "fulfilled"
      );
      const successfulMintsString = JSON.stringify(
        successfulMints.map((result) => (result as any).value)
      );
      await fs.writeFile(
        libPath.resolve('./', "successfulMints.json"),
        successfulMintsString
      );
    }
    logger.log(`${holdersSnapshot.length} of ${holdersSnapshot.length} done.`);
  };
