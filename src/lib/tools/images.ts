import { fork } from "child_process";
import { LayerItem } from "../types/GenerateArt";

export const writeImage = async (
  i: number,
  items: LayerItem[],
  outputFormat: string,
  outputPath: string,
  painterScript = "./bin/src/scripts/painter.js"
) =>
  new Promise<string>(async (resolve, reject) => {
    fork(painterScript, [
      i.toString(),
      outputFormat,
      outputPath,
      ...items.sort((a, b) => a.priority - b.priority).map(({ uri }) => uri),
    ])
      .on("exit", () => resolve(`${outputPath}/${i}.${outputFormat}`))
      .on("error", () => reject());
  });
