import fs from "fs/promises";
import mkdirp from "mkdirp";
import { Chance } from "chance";
import pLimit from "p-limit";
import os from "os";
import _includes from "lodash.includes";

import { NFTMetaData } from "../lib/types/NFTMetaData";
import { Logger } from "../lib/types/Logger";
import { LayerConfigItem, PickedLayer } from "../lib/types/GenerateArt";

import {
  getJsonTemplate,
  getLayersConfig,
  getLayerItemFSUris,
} from "../lib/tools/files.js";
import { writeImage } from "../lib/tools/images.js";
import { writeMetadataJson } from "../lib/tools/json.js";

const cpuCount = os.cpus().length;
const limit = pLimit(cpuCount);

const PAINTER_SCRIPT = "./bin/src/scripts/painter.js";

export type GenerateArtInput = {
  jsonTemplatePath: string;
  layersConfigPath: string;
  layersPath: string;
  outputPath: string;
  amount: string;
  outputFormat: "png" | "jpeg" | "webp";
};

const reRollIfException = (
  layer: string,
  exceptions: string[],
  {
    items,
    config,
  }: {
    items: Record<string, PickedLayer>;
    config: Record<string, LayerConfigItem>;
  },
  chance: Chance.Chance = new Chance()
) => {
  while (exceptions.includes(items[layer].pickedLayerItem)) {
    console.log("Rerolling layer", layer);
    items[layer].pickedLayerItem = chance.weighted(
      config[layer].items,
      config[layer].weights
    );
  }
};

const pickLayers = (
  config: Record<string, LayerConfigItem>,
  chance: Chance.Chance = new Chance()
) => {
  const items = Object.entries(config).reduce(
    (acc, [layerName, layerConfig]) => {
      console.log("Picking layer", layerName);
      try {
        return {
          ...acc,
          [layerName]: {
            priority: layerConfig.priority,
            pickedLayerItem: chance.weighted(
              layerConfig.items,
              layerConfig.weights
            ),
          },
        };
      } catch (e) {
        console.log("Error picking layer", layerName);
        throw e;
      }
    },
    {} as Record<string, PickedLayer>
  );

  // TODO: Move this into a re-ordering worker plugin.

  // #region Based
  /**
   * For each Devil DNA (both Male & Female) there
are corresponding color DEVIL HORNS which
should be attached as a TOP LAYER to all Devil
DNA. We do not want the “horns” to be listed
“trait” or “property” on secondary, etc.
   */
  // if (items["DNA"].pickedLayerItem === "Devil Green") {
  //   items["Pseudo-Devil Horns"] = {
  //     pickedLayerItem: "His Green Devil Horns",
  //     priority: 8,
  //   };
  // }
  // if (items["DNA"].pickedLayerItem === "Devil Purple") {
  //   items["Pseudo-Devil Horns"] = {
  //     pickedLayerItem: "His Purple Devil Horns",
  //     priority: 8,
  //   };
  // }
  // if (items["DNA"].pickedLayerItem === "Devil Red") {
  //   items["Pseudo-Devil Horns"] = {
  //     pickedLayerItem: "His Red Devil Horns",
  //     priority: 8,
  //   };
  // }

  if (items["DNA"].pickedLayerItem.includes("Devil Green")) {
    items["Pseudo-Devil Horns"] = {
      pickedLayerItem: "Her Green Devil Horns",
      priority: 8,
    };
  }
  if (items["DNA"].pickedLayerItem.includes("Devil Purple")) {
    items["Pseudo-Devil Horns"] = {
      pickedLayerItem: "Her Purple Devil Horns",
      priority: 8,
    };
  }
  if (items["DNA"].pickedLayerItem.includes("Devil Red")) {
    items["Pseudo-Devil Horns"] = {
      pickedLayerItem: "Her Red Devil Horns",
      priority: 8,
    };
  }

  if (
    items["DNA"].pickedLayerItem.includes("Pixel") ||
    items["DNA"].pickedLayerItem.includes("Flowers") ||
    items["DNA"].pickedLayerItem.includes("Taped") ||
    items["DNA"].pickedLayerItem.includes("Bad Frens")
  ) {
    items["Eyes"] = { ...items["Eyes"], pickedLayerItem: "None" };
    items["Mouth"] = { ...items["Mouth"], pickedLayerItem: "None" };
    items["Teardrop"] = { ...items["Teardrop"], pickedLayerItem: "None" };
  }

  if (
    items["DNA"].pickedLayerItem.includes("Robot") ||
    items["DNA"].pickedLayerItem.includes("Crystal") ||
    items["DNA"].pickedLayerItem.includes("Devil") ||
    items["DNA"].pickedLayerItem.includes("Spirit") ||
    items["DNA"].pickedLayerItem.includes("Sky")
  ) {
    const femaleSplit = {
      items: [
        "None",
        "Painted Mono",
        "Painted Rainbow",
        "Painted Vintage",
        "Taped Caution",
        "Taped Mono",
        "Taped Rainbow",
      ],
      weights: [94.95, 0.36, 0.18, 0.45, 1.58, 1.35, 1.13],
      priority: 6,
    };
    items["DNA Split"] = {
      priority: femaleSplit.priority,
      pickedLayerItem: chance.weighted(femaleSplit.items, femaleSplit.weights),
    };
    // const maleSplit = {
    //   items: [
    //     "Bad Frens Blue Split",
    //     "Bad Frens Mono Split",
    //     "Bad Frens Pink Split",
    //     "Flowers Mono Split",
    //     "Flowers Rainbow Split",
    //     "Flowers Vintage Split",
    //     "None",
    //     "Pixel Fire Split",
    //     "Pixel Mono Split",
    //     "Pixel Rainbow Split",
    //     "Taped Caution Split",
    //     "Taped Mono Split",
    //     "Taped Rainbow Split",
    //   ],
    //   weights: [
    //     0.72, 0.81, 0.9, 0.27, 0.22, 0.32, 95.05, 0.13, 0.09, 0.05, 0.54, 0.47,
    //     0.43,
    //   ],
    //   priority: 6,
    // };
    // items["DNA Split"] = {
    //   priority: maleSplit.priority,
    //   pickedLayerItem: chance.weighted(maleSplit.items, maleSplit.weights),
    // };
  }

  // //#region JungleCats Lionesses

  // if (items["Skin"].pickedLayerItem === "Zombie") {
  //   reRollIfException(
  //     "Eyes",
  //     [
  //       "Blue",
  //       "Cat Eyes",
  //       "Dragon Eyes",
  //       "Glowing Blue",
  //       "Glowing White",
  //       "Glowing Yellow",
  //       "Green",
  //       "Orange",
  //       "Red",
  //       "Snake Eyes",
  //       "Solana Eyes",
  //       "Yellow",
  //     ],
  //     {
  //       items,
  //       config,
  //     }
  //   );
  // }

  // if (items["Head"].pickedLayerItem === "Cleopatra") {
  //   reRollIfException(
  //     "Eyes",
  //     [
  //       "Eye Patch",
  //       "Heart Glasses",
  //       "Nerd Glasses",
  //       "Opera Mask",
  //       "Pit Vipers",
  //       "Ski Goggles",
  //       "Soundwave Goggles",
  //       "Steam Punk",
  //       "VR",
  //       "Laser Eyes",
  //       "Ray Eyes",
  //     ],
  //     { items, config }
  //   );
  //   reRollIfException("Accessories", ["Earrings"], { items, config });
  //   reRollIfException(
  //     "Mouth",
  //     ["Microphone", "Scuba", "Cigar", "Flower", "Grapes", "Pipe"],
  //     { items, config }
  //   );
  // } else if (items["Head"].pickedLayerItem === "Devil Horns") {
  //   reRollIfException(
  //     "Eyes",
  //     [
  //       "Eye Patch",
  //       "Nerd Glasses",
  //       "Opera Mask",
  //       "Pit Vipers",
  //       "Heart Glasses",
  //       "Steam Punk",
  //       "VR",
  //     ],
  //     { items, config }
  //   );
  // } else if (items["Head"].pickedLayerItem === "Unicorn Horn") {
  //   reRollIfException(
  //     "Eyes",
  //     [
  //       "Eye Patch",
  //       "Heart Glasses",
  //       "Nerd Glasses",
  //       "Opera Mask",
  //       "Pit Vipers",
  //       "Ski Goggles",
  //       "Soundwave Goggles",
  //       "Steam Punk",
  //       "VR",
  //     ],
  //     { items, config }
  //   );
  // } else if (items["Head"].pickedLayerItem === "Viking Helmet") {
  //   reRollIfException(
  //     "Eyes",
  //     [
  //       "Eye Patch",
  //       "Heart Glasses",
  //       "Pit Vipers",
  //       "Ski Goggles",
  //       "Soundwave Goggles",
  //       "Steam Punk",
  //       "VR",
  //     ],
  //     { items, config }
  //   );
  // } else if (items["Head"].pickedLayerItem === "Brain") {
  //   reRollIfException("Eyes", ["Pit Vipers", "Opera Mask"], { items, config });
  // } else if (items["Head"].pickedLayerItem === "Chef hat") {
  //   reRollIfException("Eyes", ["Opera Mask"], { items, config });
  // } else if (items["Head"].pickedLayerItem === "Cowboy hat") {
  //   reRollIfException("Eyes", ["Soundwave Goggles", "Ski Goggles"], {
  //     items,
  //     config,
  //   });
  // } else if (
  //   items["Head"].pickedLayerItem === "Green Mushroom Hat" ||
  //   items["Head"].pickedLayerItem === "Purple Mushroom Hat"
  // ) {
  //   reRollIfException("Eyes", ["Ski Goggles", "Soundwave Goggles", "VR"], {
  //     items,
  //     config,
  //   });
  // } else if (
  //   items["Head"].pickedLayerItem === "Pink Visor" ||
  //   items["Head"].pickedLayerItem === "Blue Visor"
  // ) {
  //   reRollIfException("Eyes", ["Soundwave Goggles", "Ski Goggles"], {
  //     items,
  //     config,
  //   });
  // } else if (items["Head"].pickedLayerItem === "Pirate Hat") {
  //   reRollIfException("Eyes", ["VR", "Pit Vipers", "Opera Mask"], {
  //     items,
  //     config,
  //   });
  // } else if (items["Head"].pickedLayerItem === "Santa Hat") {
  //   reRollIfException(
  //     "Eyes",
  //     ["Soundwave Goggles", "Ski Goggles", "VR", "Steam Punk"],
  //     {
  //       items,
  //       config,
  //     }
  //   );
  // } else if (items["Head"].pickedLayerItem === "Tiara") {
  //   reRollIfException("Eyes", ["VR", "Steam Punk", "Opera Mask"], {
  //     items,
  //     config,
  //   });
  // } else if (items["Head"].pickedLayerItem === "Wizard Hat") {
  //   reRollIfException("Eyes", ["Soundwave Goggles", "Ski Goggles"], {
  //     items,
  //     config,
  //   });
  // }

  // if (items["Eyes"].pickedLayerItem === "Opera Mask") {
  //   reRollIfException("Mouth", ["Gas Mask", "Microphone", "Scuba"], {
  //     items,
  //     config,
  //   });
  //   reRollIfException("Nose", ["Stud", "Ring", "Septum", "Butterfly"], {
  //     items,
  //     config,
  //   });
  // } else if (
  //   items["Eyes"].pickedLayerItem === "Laser Eyes" ||
  //   items["Eyes"].pickedLayerItem === "Ray Eyes"
  // ) {
  //   reRollIfException("Nose", ["Butterfly"], {
  //     items,
  //     config,
  //   });
  // }

  // if (items["Mouth"].pickedLayerItem === "Gas Mask") {
  //   reRollIfException("Nose", ["Stud", "Ring", "Septum"], {
  //     items,
  //     config,
  //   });
  // } else if (items["Mouth"].pickedLayerItem === "Scuba") {
  //   items["Nose"].pickedLayerItem = "None";
  //   reRollIfException("Accessories", ["Butterfly Wings"], {
  //     items,
  //     config,
  //   });
  // } else if (items["Mouth"].pickedLayerItem === "Microphone") {
  //   reRollIfException("Accessories", ["Bone Necklace", "Sea Shell"], {
  //     items,
  //     config,
  //   });
  // }

  // if (items["Accessories"].pickedLayerItem === "Egyptian Necklace") {
  //   reRollIfException(
  //     "Top",
  //     [
  //       "Yellow Shirt",
  //       "White Tracksuit",
  //       "Red Poncho",
  //       "Purple Shirt",
  //       "Purple Puffer Jacket",
  //       "Puffer Vest",
  //       "Pink Tracksuit",
  //       "Green Tracksuit",
  //       "Green Shirt",
  //       "Green Puffer Jacket",
  //       "Green Poncho",
  //       "Dress",
  //       "Cream Puffer Jacket",
  //       "Cargo Vest",
  //       "Blue Tracksuit",
  //       "Blue Shirt",
  //       "Black Puffer Jacket",
  //       "Black Shirt",
  //     ],
  //     {
  //       items,
  //       config,
  //     }
  //   );
  // }

  // //#endregion

  // //#region Ordering
  // if (
  //   items["Accessories"].pickedLayerItem === "Butterfly Wings" ||
  //   items["Accessories"].pickedLayerItem === "Wings"
  // ) {
  //   for (const layer of Object.keys(items)) {
  //     if (layer !== "Background") {
  //       items[layer].priority += 1;
  //     }
  //   }
  //   items["Accessories"].priority = 1;
  // }
  // if (items["Mouth"].pickedLayerItem === "Scuba") {
  //   for (const layer of Object.keys(items)) {
  //     if (layer !== "Background") {
  //       items[layer].priority += 1;
  //     }
  //   }
  //   items["Pseudo"] = {
  //     pickedLayerItem: "Scuba",
  //     priority: 1,
  //   };
  // }

  // if (
  //   items["Mouth"].pickedLayerItem === "Microphone" &&
  //   items["Eyes"].pickedLayerItem !== "Ray Eyes" &&
  //   items["Eyes"].pickedLayerItem !== "Laser Eyes"
  // ) {
  //   items["Mouth"].priority =
  //     Object.entries(items)
  //       .map((i) => i[1].priority)
  //       .sort((a, b) => b - a)[0] + 1;
  // }
  // if (
  //   items["Mouth"].pickedLayerItem === "Sneakers" &&
  //   items["Head"].pickedLayerItem === "Cleopatra"
  // ) {
  //   items["Mouth"].priority =
  //     Object.entries(items)
  //       .map((i) => i[1].priority)
  //       .sort((a, b) => b - a)[0] + 1;
  // }
  // if (items["Accessories"].pickedLayerItem === "Egyptian Necklace") {
  //   items["Accessories"].priority = items["Top"].priority - 0.1; // Behind by little.
  // }
  // if (items["Nose"].pickedLayerItem === "Butterfly") {
  //   items["Nose"].priority =
  //     Object.entries(items)
  //       .map((i) => i[1].priority)
  //       .sort((a, b) => b - a)[0] + 1;
  // }
  // if (
  //   items["Eyes"].pickedLayerItem === "Ray Eyes" ||
  //   items["Eyes"].pickedLayerItem === "Laser Eyes"
  // ) {
  //   items["Eyes"].priority =
  //     Object.entries(items)
  //       .map((i) => i[1].priority)
  //       .sort((a, b) => b - a)[0] + 1;
  // }
  // //#endregion
  return items;
};

const generateNFT = async (
  i: number,
  { layersPath, outputFormat, outputPath }: GenerateArtInput,
  layersConfig: Record<string, LayerConfigItem>,
  jsonTemplate: NFTMetaData,
  logger?: Logger
) => {
  // TODO: Create a file system cache since this doesn't regularly change during generation
  const pickedLayerItems = await Promise.all(
    getLayerItemFSUris(layersPath, pickLayers(layersConfig))
  );
  logger?.log(`[${i + 1}] - ${JSON.stringify(pickedLayerItems)}`);
  const [imageUri, { jsonTemplateForItem, metaDataUri }] = await Promise.all([
    writeImage(i, pickedLayerItems, outputFormat, outputPath, PAINTER_SCRIPT),
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

    logger.log("Reading files and creating output directory...");
    const [jsonTemplate, layersConfig] = await Promise.all([
      getJsonTemplate(input.jsonTemplatePath),
      getLayersConfig(input.layersConfigPath),
      mkdirp(input.outputPath),
    ]);

    const results = await Promise.all(
      [...Array(totalAmount).keys()].map((i) =>
        limit(async () => {
          try {
            logger.log(`Starting: ${i + 1}.`);
            const result = await generateNFT(
              i,
              input,
              layersConfig,
              jsonTemplate,
              logger
            );
            return result;
          } catch (e) {
            logger.error(`Error: ${i + 1}.`);
            throw e;
          } finally {
            logger.log(`Completed: ${i + 1}.`);
          }
        })
      )
    );
    const attributesMap = results.map(({ jsonTemplateForItem }) => ({
      id: jsonTemplateForItem.name,
      attributes: jsonTemplateForItem.attributes,
    }));
    const repeatedAttributes = attributesMap
      .map((i) => i.attributes)
      .filter((val, i, iteratee) => _includes(iteratee, val, i + 1));
    const repeated = attributesMap.filter(({ attributes }) =>
      repeatedAttributes.includes(attributes)
    );
    logger.log(`Repeated items: ${JSON.stringify(repeated, null, 2)}`);
    logger.log("Saving all.json...");
    await fs.writeFile(
      `${input.outputPath}/all.json`,
      JSON.stringify(results.map((i) => i.jsonTemplateForItem))
    );
    logger.log("Done saving all.json...");
    logger.log("Done generating NFTs.");
  };
