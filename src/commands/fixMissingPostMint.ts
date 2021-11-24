import axios from "axios";
import Ora from "ora";
import fs, { readFile } from "fs/promises";
import {} from "process";
import { Logger } from "../lib/types/Logger";
import { NFTMetaData } from "../lib/types/NFTMetaData";
import { PseudoCache, PseudoCacheItem } from "../lib/types/PseudoCache";
import pLimit from "p-limit";
import { uploadNFTToArweave } from "../lib/uploader/nftUploader.js";
import { createArweave } from "../lib/arweave/createArweave.js";
import {
  decodeMintsFile,
  downloadMintsFile,
  findMintForNFTName,
  updateNFTUri,
} from "../lib/metaboss.js";
import path from "path";

type ReUploadStatus = "ALL" | "IMAGE_ONLY" | "NONE";

type ReUploadItem = {
  identifier: string;
  reUploadStatus: ReUploadStatus;
};

const itemNeedsReUpload = async (
  item: PseudoCacheItem
): Promise<ReUploadStatus> => {
  const ora = Ora(``).start();
  let wasAbleToUploadJson = false;
  try {
    const metadata = await axios.get<NFTMetaData>(item.link);
    ora.succeed(`${item.name} JSON is fine.`);
    const { data } = metadata;
    wasAbleToUploadJson = true;
    await axios.head(data.image);
    ora.succeed(`${item.name} at: ${item.link} is present.`);
    return "NONE";
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      ora.fail(`${item.name} at: ${item.link} needs to be fixed.`);
      if (!wasAbleToUploadJson) {
        return "ALL";
      }
      return "IMAGE_ONLY";
    } else {
      throw error;
    }
  } finally {
    ora.stop();
  }
};

type FixMissingPostMintOptions = {
  path: string;
  key: string;
  cache: string;
  threads: string;
  rpc: string;
  solanaKeypair: string;
  id: string;
};

export const createFixMissingPostMintCommand =
  (logger: Logger) => async (options: FixMissingPostMintOptions) => {
    const ora = Ora(`Reading jwk and pseudoCache`).start();
    const limit = pLimit(parseInt(options.threads));
    const jwk = JSON.parse(await readFile(options.key, "utf8"));
    const arweave = createArweave();
    const pseudoCache = JSON.parse(
      await fs.readFile(options.cache, "utf-8")
    ) as PseudoCache;

    ora.succeed();
    ora.stop();
    const promises: Promise<ReUploadItem>[] = [];
    for (const [id, item] of Object.entries(pseudoCache.items)) {
      promises.push(
        limit(async () => ({
          identifier: id,
          reUploadStatus: await itemNeedsReUpload(item),
        }))
      );
    }
    const results = await Promise.all(promises);
    const itemsToFix = results.filter(
      ({ reUploadStatus }) => reUploadStatus !== "NONE"
    );
    const itemsToFixCount = itemsToFix.length;
    if (itemsToFixCount === 0) {
      logger.log(`No items need to be fixed.`);
      return;
    }
    logger.log(`${itemsToFixCount} items need to be fixed.`);
    const spinner = Ora(`Getting mints...`).start();
    await downloadMintsFile(options.rpc, "./temp", options.id);
    spinner.succeed();
    spinner.start(`Decoding mints...`);
    await decodeMintsFile(
      options.rpc,
      `${options.id}_mint_accounts.json`,
      "./temp",
      "./temp-decoded"
    );
    spinner.succeed();
    for (const { identifier } of itemsToFix) {
      spinner.start(`Fixing ${identifier}: Uploading new uri...`);
      const newURL = await uploadNFTToArweave(
        {
          item: parseInt(identifier),
          optionsPath: options.path,
          pseudoCachePath: options.cache.slice(
            0,
            options.cache.lastIndexOf("/")
          ),
          animatedFormat: "none", // TODO: Add support to fix animated NFTs.
          imageFormat: "png",
        },
        { logger, arweave, jwk, limit },
        5,
        false
      );
      spinner.succeed();
      logger.log(`New uri: ${newURL}`);
      spinner.start(`Fixing ${identifier}: Finding Match...`);
      const file = await readFile(
        path.join(options.path, `${identifier}.json`),
        "utf-8"
      );
      const nft = JSON.parse(file) as NFTMetaData;
      const mint = await findMintForNFTName(nft.name, "./temp-decoded");
      if (!mint) {
        logger.log(
          `Could not find mint for ${nft.name}, probably not minted yet.`
        );
        spinner.fail();
        spinner.stop();
        continue;
      }
      spinner.succeed();
      logger.log(`Fixing ${identifier}: Match found...`);
      spinner.start(`Fixing ${identifier}: Updating NFT Uri...`);
      await updateNFTUri(options.rpc, mint, options.solanaKeypair, newURL);
      spinner.succeed(`Fixing ${identifier}: Updating NFT Uri...`);
      spinner.stop();
    }
  };
