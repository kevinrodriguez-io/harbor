import Arweave from "arweave";
import axios from "axios";
import { appendFile, readFile } from "fs/promises";
import retry from "async-retry";
import { JWKInterface } from "../types/JWK";
import { Logger } from "../types/Logger";
import { LimitFunction } from "p-limit";
import { AnimationInput, ImageInput } from "../../commands/upload";

type UploadNFTToArweaveDeps = {
  logger: Logger;
  limit: LimitFunction;
  jwk: JWKInterface;
  arweave: Arweave;
};

type UploadToArweaveInput = {
  optionsPath: string;
  pseudoCachePath: string;
  item: number;
  animatedFormat: AnimationInput;
  imageFormat: ImageInput;
};

type UploadMetadataToArweaveInput = UploadToArweaveInput & {
  uploadedImageUri: string;
  uploadedVideoUri: string | null;
};

type AssetFormat = "png" | "jpeg" | "jpg" | "gif" | "mp4";

const getContentTypeFromInputFormat = (type: AssetFormat) => {
  switch (type) {
    case "mp4":
      return "video/mp4";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "image/png";
  }
};

export const uploadArweaveBinary = async (
  { optionsPath, item }: Omit<UploadToArweaveInput, "pseudoCachePath">,
  { logger, arweave, jwk }: Omit<UploadNFTToArweaveDeps, "limit">,
  type: AssetFormat
) => {
  try {
    logger.log(`Uploading ${item}.${type}`);
    const file = await readFile(`${optionsPath}/${item}.${type}`);
    const uploadFileTransaction = await arweave.createTransaction(
      { data: file },
      jwk
    );
    uploadFileTransaction.addTag(
      "Content-Type",
      getContentTypeFromInputFormat(type)
    );
    await arweave.transactions.sign(uploadFileTransaction, jwk);
    const uploader = await arweave.transactions.getUploader(
      uploadFileTransaction
    );
    while (!uploader.isComplete) {
      await uploader.uploadChunk();
      logger.log(`${item}.${type}: ${uploader.pctComplete}%`);
    }
    logger.log(`${item}.${type} uploaded`);
    const uri = `https://arweave.net/${uploadFileTransaction.id}?ext=${type}`;
    logger.log(`${item}.${type} checking url presence at ${uri}.`);
    await axios.head(uri);
    logger.log(`${item}.${type} url presence at ${uri} is fine.`);
    return uri;
  } catch (error) {
    logger.error(error);
    logger.log(`Retry: ${item}.${type}`);
    throw error;
  }
};

export const uploadArweaveMetadata = async (
  {
    item: i,
    optionsPath,
    uploadedImageUri,
    uploadedVideoUri,
  }: Omit<UploadMetadataToArweaveInput, "pseudoCachePath">,
  { logger, arweave, jwk }: Omit<UploadNFTToArweaveDeps, "limit">
) => {
  try {
    logger.log(`Uploading ${i}.json`);
    const file = JSON.parse(
      await readFile(`${optionsPath}/${i}.json`, `utf-8`)
    );
    file.image = uploadedImageUri;
    file.animation_url = uploadedVideoUri;
    const uploadFileTransaction = await arweave.createTransaction(
      { data: JSON.stringify(file) },
      jwk
    );
    uploadFileTransaction.addTag("Content-Type", "application/json");
    await arweave.transactions.sign(uploadFileTransaction, jwk);
    const uploader = await arweave.transactions.getUploader(
      uploadFileTransaction
    );
    while (!uploader.isComplete) {
      await uploader.uploadChunk();
      logger.log(`${uploader.pctComplete}%`);
    }
    logger.log(`${i}.json uploaded`);
    const uri = `https://arweave.net/${uploadFileTransaction.id}`;
    logger.log(`${i}.json checking url presence at ${uri}`);
    await axios.head(uri);
    logger.log(`${i}.json url presence is fine at ${uri}`);
    return uri;
  } catch (error) {
    logger.error(error);
    logger.log(`Retry: ${i}.json`);
    throw error;
  }
};

export const uploadNFTToArweave = async (
  input: UploadToArweaveInput,
  deps: UploadNFTToArweaveDeps,
  retries: number,
  createCache = true
) => {
  try {
    const uploadedImageUri = await uploadArweaveBinaryWithRetry(
      input,
      deps,
      retries,
      input.imageFormat
    );
    let uploadedVideoUri: string | null = null;
    if (input.animatedFormat && input.animatedFormat !== 'none') {
      uploadedVideoUri = await uploadArweaveBinaryWithRetry(
        input,
        deps,
        retries,
        input.animatedFormat
      );
    }
    const uploadedJsonUri = await uploadArweaveMetadataWithRetry(
      {
        ...input,
        uploadedImageUri,
        uploadedVideoUri,
      },
      deps,
      retries
    );
    deps.logger.log(`${input.item} uploaded: ${uploadedJsonUri}`);
    if (createCache) {
      await appendFile(
        input.pseudoCachePath,
        `${JSON.stringify({
          [input.item.toString()]: uploadedJsonUri,
        })},`
      );
    }
    return uploadedJsonUri;
  } catch (error) {
    deps.logger.error(error);
    throw error;
  }
};

export const uploadArweaveBinaryWithRetry = (
  input: UploadToArweaveInput,
  deps: UploadNFTToArweaveDeps,
  retries: number,
  type: AssetFormat
) => retry(() => uploadArweaveBinary(input, deps, type), { retries });

export const uploadArweaveMetadataWithRetry = (
  input: UploadMetadataToArweaveInput,
  deps: UploadNFTToArweaveDeps,
  retries: number
) => retry(() => uploadArweaveMetadata(input, deps), { retries });

export const uploadNFTToArweaveWithLimit = (
  config: UploadToArweaveInput,
  deps: UploadNFTToArweaveDeps,
  retries: number
) => deps.limit(() => uploadNFTToArweave(config, deps, retries));
