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
import { NFTMetaData } from "../lib/types/NFTMetaData";

type DropToHoldersInput = {
  path: string;
  key: string;
  solanaKeypair: string;
  id: string;
  snapshotFile: string;
  rpc: string;
  threads: string;
  retries: string;
  cache: string;
};

type CMHolderListItem = {
  associatedTokenAddress: string;
  metadataAccount: string;
  mintAccount: string;
  ownerWallet: string;
};

type CacheItem = {
  arweaveUrl: string | null;
  transactionId: string | null;
  mint: string | null;
  ownerWallet: string | null;
  sourceWallet: string | null;
  itemNumber: string | null;
};

const getMintAccount = (string: string) => {
  const stringArray = string.split("\n");
  return stringArray[1].split(":")[1].trim();
};

const getTxId = (string: string) => {
  const stringArray = string.split("\n");
  return stringArray[0].split(":")[1].trim();
};

export const createDropToHoldersCommand =
  (logger: Logger) => async (opts: DropToHoldersInput) => {
    const {
      solanaKeypair,
      path,
      snapshotFile,
      rpc,
      threads,
      retries: unParsedRetries,
      key: optionsKey,
      cache,
    } = opts;
    logger.log("Starting drop_to_holders command.");
    logger.log(`Opts: ${JSON.stringify(opts)}`);
    const arweave = createArweave();
    logger.log(`Reading Arweave Key.`);
    const key = await fs.readFile(optionsKey, "utf-8");
    logger.log(`Got Arweave Key.`);

    const jwk = JSON.parse(key);

    const limit = pLimit(parseInt(threads));
    const retries = parseInt(unParsedRetries);

    logger.log(`Configuration - limit: ${threads}, retries: ${retries}.`);

    const connection = new Web3.Connection(rpc);
    logger.log(`Reading snapshot ${snapshotFile}`);
    const snapshotFileContents = await fs.readFile(snapshotFile, "utf-8");
    logger.log(`Reading snapshot ${snapshotFile} done.`);
    const holdersSnapshot: CMHolderListItem[] =
      JSON.parse(snapshotFileContents);

    const walletAddress = await arweave.wallets.jwkToAddress(jwk);
    const balance = await arweave.wallets.getBalance(walletAddress);

    logger.log(`Arweave Balance: ${balance}`);

    const allPromises: Promise<[string, string]>[] = [];

    logger.log(`Reading Sol keypair: ${solanaKeypair}`);

    const sourceKeypair = await fs
      .readFile(solanaKeypair, "utf-8")
      .then((key) => {
        const keyPairSecret = JSON.parse(key) as number[];
        return Web3.Keypair.fromSecretKey(Uint8Array.from(keyPairSecret));
      });

    logger.log(
      `Got Sol keypair, public key: ${sourceKeypair.publicKey.toBase58()}`
    );

    for (const [
      i,
      { metadataAccount, ownerWallet },
    ] of holdersSnapshot.entries()) {
      const promise: Promise<[string, string]> = limit(async () =>
        retry(
          async () => {
            const tokenMetadataAccountInfo = await connection.getAccountInfo(
              new Web3.PublicKey(metadataAccount)
            );
            const attachedMetadata = decodeMetadata(
              tokenMetadataAccountInfo!.data
            );

            const number = parseInt(attachedMetadata.data.name.split("#")[1]);

            const fileContents = JSON.parse(
              await fs.readFile(
                libPath.resolve(path, `${number}.json`),
                "utf-8"
              )
            ) as NFTMetaData;

            const imageFormat = fileContents.image.endsWith("gif")
              ? "gif"
              : "jpg";

            const uri = await uploadNFTToArweave(
              {
                animatedFormat: "none",
                imageFormat,
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

            logger.log(`Running mint command with metaboss.`)
            logger.log(`Minting ${number} from: ${solanaKeypair}, to: ${ownerWallet}`);
            const output = await retry(() =>
              mintOneNFT(rpc, solanaKeypair, ownerWallet, "./temp", {
                name: meta.name,
                symbol: meta.symbol,
                uri,
                seller_fee_basis_points: meta.seller_fee_basis_points,
                creators: meta.properties.creators.map(
                  (creator: {
                    address: string;
                    verified: boolean;
                    share: number;
                  }) => ({
                    ...creator,
                    verified: false,
                  })
                ),
              }), {
                retries: 5,
                onRetry: (error, attempt) => {
                  logger.error(`Retrying minting: ${error.message}. Attempt: ${attempt}/5`);
                }
              }
            );

            logger.log(output);
            const txId = getTxId(output);
            const mintAccount = getMintAccount(output);

            const cacheItem: CacheItem = {
              arweaveUrl: uri,
              transactionId: txId,
              mint: mintAccount,
              itemNumber: number.toString(),
              ownerWallet,
              sourceWallet: sourceKeypair.publicKey.toBase58(),
            };

            logger.log(
              `Saving cacheItem: ${JSON.stringify(cache)} in ${cache}`
            );

            await fs.appendFile(
              cache,
              JSON.stringify(cacheItem) + "\n",
              "utf-8"
            );

            return [txId, mintAccount];
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

    logger.log("Finished items.");

    if (failed.length > 0) {
      logger.error(`${failed.length} of ${holdersSnapshot.length} failed.`);
    } else {
      // Write all successful promises mints to a file.
      const successfulMints = results.filter(
        (result) => result.status === "fulfilled"
      ) as PromiseFulfilledResult<[string, string]>[];
      const successfulMintsString = JSON.stringify(
        successfulMints.map((result) => ({
          txId: result.value[0],
          mint: result.value[1],
        }))
      );
      await fs.writeFile(
        libPath.resolve("./", "successfulMints.json"),
        successfulMintsString
      );
    }
    logger.log(`${holdersSnapshot.length} of ${holdersSnapshot.length} done.`);
  };
