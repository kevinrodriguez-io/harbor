import fs from "fs/promises";
import { LayerConfigItem, LayerItem, PickedLayer } from "../types/GenerateArt";
import { NFTMetaData } from "../types/NFTMetaData";

export const getHighestFileNumber = async (path: string) => {
  const files = await fs.readdir(path);
  const [highestNumber] = [
    ...new Set(
      files
        .filter((i) => i !== ".DS_Store")
        .map((f) =>
          parseInt(
            f
              .replace(".json", "")
              .replace(".png", "")
              .replace(".jpg", "")
              .replace(".jpeg", "")
              .replace(".gif", "")
              .replace(".mp4", "")
          )
        )
    ),
  ].sort((a, b) => b - a);
  return highestNumber;
};

export const readAs = async <T>(file: string) =>
  JSON.parse(await fs.readFile(file, "utf-8")) as T;

export const getJsonTemplate = async (path: string) =>
  readAs<NFTMetaData>(path);

export const getLayersConfig = async (path: string) =>
  readAs<Record<string, LayerConfigItem>>(path);

export const getPickedLayers = async (path: string) =>
  readAs<Record<string, PickedLayer>>(path);

export const getLayerItemFSUri = async (
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

export const getLayerItemFSUris = (
  layersPath: string,
  pickedItems: Record<string, PickedLayer>
) =>
  Object.entries(pickedItems).map<Promise<LayerItem>>(
    async ([layerName, { pickedLayerItem: item, priority }]) => ({
      layerName,
      item,
      priority,
      uri: await getLayerItemFSUri(layersPath, {
        layerName,
        item,
      }),
    })
  );
