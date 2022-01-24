import mkdirp from "mkdirp";

import { Logger } from "../lib/types/Logger";

import {
  getJsonTemplate,
  getLayerItemFSUris,
  getPickedLayers,
} from "../lib/tools/files.js";
import { writeImage } from "../lib/tools/images.js";
import { writeMetadataJson } from "../lib/tools/json.js";

type BuildSpecificArtInput = {
  jsonTemplatePath: string;
  pickedLayersPath: string;
  layersPath: string;
  outputPath: string;
  itemNumber: string;
  outputFormat: "png" | "jpeg" | "webp";
};

const PAINTER_SCRIPT = "./bin/src/scripts/painter.js";

export const createBuildSpecificArtCommand =
  (logger: Logger) =>
  async ({
    jsonTemplatePath,
    pickedLayersPath,
    layersPath,
    outputPath,
    outputFormat,
    itemNumber: itemNumberUnparsed,
  }: BuildSpecificArtInput) => {
    const itemNumber = parseInt(itemNumberUnparsed, 10);
    logger.log("Reading files and creating the output directory...");
    const [jsonTemplate, pickedLayers] = await Promise.all([
      getJsonTemplate(jsonTemplatePath),
      getPickedLayers(pickedLayersPath),
      mkdirp(outputPath),
    ]);
    logger.log("Getting uris...");
    const uris = await Promise.all(
      getLayerItemFSUris(layersPath, pickedLayers)
    );
    logger.log(
      `Writing image+metadata... ${outputPath}/${itemNumber}.${outputFormat}+json`
    );
    await Promise.all([
      writeImage(itemNumber, uris, outputFormat, outputPath, PAINTER_SCRIPT),
      writeMetadataJson(
        itemNumber,
        jsonTemplate,
        uris,
        outputFormat,
        outputPath
      ),
    ]);
    logger.log("Done");
  };
