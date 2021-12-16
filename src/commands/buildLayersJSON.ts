import fs from "fs/promises";
import { Logger } from "../lib/types/Logger";

type BuildLayersJSONInput = {
  path: string;
  output: string;
};

export const createBuildLayersJSONCommand =
  (logger: Logger) =>
  async ({ path, output }: BuildLayersJSONInput) => {
    logger.log(`Building layers JSON file at ${output}`);
    const rootFolder = await fs.readdir(path);
    logger.log(`Found ${rootFolder.length} layers`);
    const result: Record<string, { items: string[]; weights: number[] }> = {};
    for (const folder of rootFolder) {
      const layerItems = await fs.readdir(`${path}/${folder}`);
      result[folder] = {
        items: layerItems.map((i) => i.replace(".png", "").replace(".jpg", "")),
        weights: Array(layerItems.length).fill(
          Math.floor(100 / layerItems.length)
        ),
      };
    }
    logger.log(`Writing layers JSON file at ${output}`);
    await fs.writeFile(output, JSON.stringify(result, null, 2));
    logger.log(`Done building layers JSON file at ${output}`);
  };
