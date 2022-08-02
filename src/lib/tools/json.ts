import { LayerItem } from "../types/GenerateArt";
import { NFTMetaData } from "../types/NFTMetaData";
import { padNumber } from "./string.js";
import fs from "fs/promises";

export const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const writeMetadataJson = async (
  i: number,
  jsonTemplate: NFTMetaData,
  pickedLayerItems: LayerItem[],
  outputFormat: string,
  outputPath: string,
  disableIncrementInName: boolean = false
) => {
  const jsonTemplateForItem = clone(jsonTemplate);
  jsonTemplateForItem.name = `${jsonTemplateForItem.name} #${padNumber(
    disableIncrementInName ? i : i + 1
  )}`;
  jsonTemplateForItem.attributes = pickedLayerItems.map(
    ({ layerName, item }) => ({
      trait_type: layerName,
      value: item,
    })
  ).filter(i => !i.trait_type.includes("Pseudo"));
  jsonTemplateForItem.image = `${i}.${outputFormat}`;
  const metaDataUri = `${outputPath}/${i}.json`;
  await fs.writeFile(
    metaDataUri,
    JSON.stringify(jsonTemplateForItem, null, 2),
    "utf-8"
  );
  return { metaDataUri, jsonTemplateForItem };
};
