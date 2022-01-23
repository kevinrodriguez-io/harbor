import { appendFile, readFile, writeFile } from "fs/promises";
import pLimit from "p-limit";

import { createArweave } from "../lib/arweave/createArweave.js";
import { removeLastOccurrence } from "../lib/tools/string.js";
import { getHighestFileNumber } from "../lib/tools/files.js";
import { PseudoCacheItem } from "../lib/types/PseudoCache.js";
import { Logger } from "../lib/types/Logger.js";
import { uploadNFTToArweaveWithLimit } from "../lib/uploader/nftUploader.js";

export const getOrCreatePseudoCacheFile = async (pseudoCachePath: string) => {
  try {
    await readFile(pseudoCachePath, "utf-8");
  } catch (error: any) {
    if (error.code === "ENOENT") {
      await writeFile(pseudoCachePath, "[");
    }
  }
};

const getParsedPseudoCache = async (pseudoCachePath: string) => {
  const pseudoCache = await readFile(pseudoCachePath, "utf-8");
  const isPseudoCacheIncomplete = !pseudoCache.includes("]");
  const parsedPseudoCache = JSON.parse(
    isPseudoCacheIncomplete
      ? `${removeLastOccurrence(pseudoCache, ",")}]`
      : pseudoCache
  );
  return parsedPseudoCache;
};

export type AnimationInput = "mp4" | "gif" | "none";
export type ImageInput = "jpg" | "jpeg" | "png" | "gif" | "webp";

type UploaderOptions = {
  key: string;
  path: string;
  retries: string;
  threads: string;
  animatedFormat: AnimationInput;
  imageFormat: ImageInput;
};

export const createUploaderCommand =
  (logger: Logger, pseudoCachePath: string) =>
  async ({
    animatedFormat = "none",
    imageFormat = "png",
    threads = "10",
    retries: unParsedRetries = "5",
    ...options
  }: UploaderOptions) => {
    const arweave = createArweave();
    const limit = pLimit(parseInt(threads));
    const retries = parseInt(unParsedRetries);
    const optionsPath = options.path;
    const key = await readFile(options.key, "utf8");
    const jwk = JSON.parse(key);
    const walletAddress = await arweave.wallets.jwkToAddress(jwk);
    const balance = await arweave.wallets.getBalance(walletAddress);

    logger.log(`Starting Balance: ${balance}`);

    const highestNumber = await getHighestFileNumber(optionsPath);

    const promises: Promise<string>[] = [];
    await getOrCreatePseudoCacheFile(pseudoCachePath);
    const parsedPseudoCache: Record<string, PseudoCacheItem>[] =
      await getParsedPseudoCache(pseudoCachePath);
    console.log({ parsedPseudoCache });
    for (let i = 0; i <= highestNumber; i++) {
      const shouldSkip = parsedPseudoCache.find(
        (item, _, __, key = Object.entries(item)[0][0]) => key === i.toString()
      );
      if (shouldSkip) {
        logger.log(`Skipping ${i}`);
        continue;
      }
      promises.push(
        uploadNFTToArweaveWithLimit(
          {
            item: i,
            optionsPath,
            pseudoCachePath,
            animatedFormat,
            imageFormat,
          },
          { logger, jwk, arweave, limit },
          retries
        )
      );
    }
    const allPromises = await Promise.allSettled(promises);
    const failed = allPromises.filter(({ status }) => status === "rejected");
    if (failed.length > 0) {
      logger.error(
        `${failed.length} failed, run the process again. (Self corrective).`
      );
    } else {
      logger.log(`All done successfully.`);
      await appendFile(pseudoCachePath, "]");
      logger.log("Cleaning and sorting pseudoCache.");
      const currentPseudoCache = removeLastOccurrence(
        await readFile(pseudoCachePath, "utf-8"),
        ","
      );
      const json = JSON.parse(currentPseudoCache);
      // Sort by key
      json.sort((a: any, b: any) => {
        const [entriesA] = Object.entries(a);
        const [aKey] = entriesA;
        const [entriesB] = Object.entries(b);
        const [bKey] = entriesB;
        return parseInt(aKey) - parseInt(bKey);
      });
      logger.log("Saving sorted JSON.");
      // Save json
      const pseudoCacheObj: Record<string, any> = {};
      for (const entry of json) {
        const [key, value] = Object.entries<{
          link: string;
          name: string;
          imageLink: string;
          onChain: boolean;
        }>(entry)[0];
        pseudoCacheObj[key] = {
          link: value.link,
          name: value.name,
          imageLink: value.imageLink,
          onChain: false,
        };
      }
      await writeFile(
        pseudoCachePath,
        JSON.stringify({ items: pseudoCacheObj })
      );
    }
    const finishingBalance = await arweave.wallets.getBalance(walletAddress);
    logger.log(`Finish Balance: ${finishingBalance}`);
  };
