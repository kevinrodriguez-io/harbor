import fs from "fs/promises";
import { fork } from "child_process";
import { Chance } from "chance";
import pLimit from "p-limit";
import os from "os";
import _includes from "lodash.includes";

import { NFTMetaData } from "../lib/types/NFTMetaData";
import { Logger } from "../lib/types/Logger";
import { padNumber } from "../lib/tools/string.js";

const cpuCount = os.cpus().length;
const limit = pLimit(cpuCount);

const PAINTER_SCRIPT = "../scripts/painter.js";

type LayerConfigItem = {
  items: string[];
  weights: number[];
};

type LayerItem = {
  layerName: string;
  item: string;
  uri: string;
};

export type GenerateArtPluginsInput = {
  preGenerateRarityPluginPath?: string | null;
  onGenerateRarityPluginPath?: string | null;
  postGenerateRarityPluginPath?: string | null;
};

export type GenerateArtInput = {
  jsonTemplatePath: string;
  layersConfigPath: string;
  layersPath: string;
  outputPath: string;
  amount: string;
  outputFormat: "png" | "jpeg";
} & GenerateArtPluginsInput;

const getJsonTemplate = async (jsonTemplatePath: string) =>
  JSON.parse(await fs.readFile(jsonTemplatePath, "utf-8")) as NFTMetaData;

const getLayersConfig = async (layersConfigPath: string) =>
  JSON.parse(await fs.readFile(layersConfigPath, "utf-8")) as Record<
    string,
    LayerConfigItem
  >;

const pickLayers = (
  layersConfig: Record<string, LayerConfigItem>,
  chance: Chance.Chance = new Chance()
) =>
  Object.entries(layersConfig).reduce(
    (acc, [layerName, layerConfig]) => ({
      ...acc,
      [layerName]: chance.weighted(layerConfig.items, layerConfig.weights),
    }),
    {} as Record<string, string>
  );

const getLayerItemUri = async (
  layersPath: string,
  { layerName, item }: { layerName: string; item: string }
) => {
  const layerPath = `${layersPath}/${layerName}`;
  const files = await fs.readdir(layerPath);
  const file = files.find((file) => file.includes(item));
  if (!file) {
    throw new Error(`${layerName}/${item} not found`);
  }
  return `${layerPath}/${file}`;
};

const getLayerItemUris = (
  layersPath: string,
  pickedItems: Record<string, string>
) =>
  Promise.all(
    Object.entries(pickedItems).map(
      async ([layerName, item]) =>
        ({
          layerName,
          item,
          uri: await getLayerItemUri(layersPath, { layerName, item }),
        } as LayerItem)
    )
  );

const writeImage = async (
  i: number,
  items: LayerItem[],
  outputFormat: string,
  outputPath: string
) =>
  new Promise<string>(async (resolve, reject) => {
    fork(PAINTER_SCRIPT, [
      i.toString(),
      outputFormat,
      outputPath,
      ...items.map((i) => i.uri),
    ])
      .on("exit", () => resolve(`${outputPath}/${i}.${outputFormat}`))
      .on("error", () => reject());
  });

const cloneTemplate = (jsonTemplate: NFTMetaData) =>
  JSON.parse(JSON.stringify(jsonTemplate)) as NFTMetaData;

const writeMetadataJson = async (
  i: number,
  jsonTemplate: NFTMetaData,
  pickedLayerItems: LayerItem[],
  outputFormat: string,
  outputPath: string
) => {
  const jsonTemplateForItem = cloneTemplate(jsonTemplate);
  jsonTemplateForItem.name = `${jsonTemplateForItem.name} #${padNumber(i + 1)}`;
  jsonTemplateForItem.attributes = pickedLayerItems.map(
    ({ layerName, item }) => ({
      trait_type: layerName,
      value: item,
    })
  );
  jsonTemplateForItem.image = `${i}.${outputFormat}`;
  const metaDataUri = `${outputPath}/${i}.json`;
  await fs.writeFile(
    metaDataUri,
    JSON.stringify(jsonTemplateForItem, null, 2),
    "utf-8"
  );
  return { metaDataUri, jsonTemplateForItem };
};

const generateNFT = async (
  i: number,
  { layersPath, outputFormat, outputPath }: GenerateArtInput,
  layersConfig: Record<string, LayerConfigItem>,
  jsonTemplate: NFTMetaData
) => {
  const pickedLayerItems = await getLayerItemUris(
    layersPath,
    pickLayers(layersConfig)
  );
  const [imageUri, { jsonTemplateForItem, metaDataUri }] = await Promise.all([
    writeImage(i, pickedLayerItems, outputFormat, outputPath),
    writeMetadataJson(
      i,
      jsonTemplate,
      pickedLayerItems,
      outputFormat,
      outputPath
    ),
  ]);
  return {
    imageUri,
    metaDataUri,
    jsonTemplateForItem,
  };
};

export const createGenerateArtCommand =
  (logger: Logger) => async (input: GenerateArtInput) => {
    const totalAmount = parseInt(input.amount, 10);
    logger.log(`Generating ${totalAmount} NFTs...`);

    logger.log("Reading template...");
    const jsonTemplate = await getJsonTemplate(input.jsonTemplatePath);

    logger.log("Reading layers config...");
    const layersConfig = await getLayersConfig(input.layersConfigPath);

    const results = await Promise.all(
      [...Array(totalAmount).keys()].map((i) =>
        limit(async () => {
          try {
            logger.log(`Starting: ${i + 1}.`);
            const result = await generateNFT(
              i,
              input,
              layersConfig,
              jsonTemplate
            );
            return result;
          } catch (e) {
            logger.log(`Error: ${i + 1}.`);
            logger.error(e);
            throw e;
          } finally {
            logger.log(`Completed: ${i + 1}.`);
          }
        })
      )
    );
    const attrsAndIds = results.map(({ jsonTemplateForItem }) => ({
      id: jsonTemplateForItem.name,
      attributes: jsonTemplateForItem.attributes,
    }));
    const repeatedAttrs = attrsAndIds
      .map((i) => i.attributes)
      .filter((val, i, iteratee) => _includes(iteratee, val, i + 1));
    const repeated = attrsAndIds.filter((i) =>
      repeatedAttrs.includes(i.attributes)
    );
    logger.log(`Repeated items: ${JSON.stringify(repeated, null, 2)}`);
    logger.log(
      `If there are too many repeated Items try adding more features or manually edit them to add some really unique items.`
    );
    // Save all the generated NFTs to the output directory
    logger.log("Saving all.json...");
    await fs.writeFile(
      `${input.outputPath}/all.json`,
      JSON.stringify(results.map((i) => i.jsonTemplateForItem))
    );
    logger.log("Done saving all.json...");
    logger.log("Done generating NFTs.");
  };
