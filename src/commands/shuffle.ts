import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import ora from "ora";

type ShuffleCommandInput = {
  path: string;
};

const shuffle = async (filesPath: string) => {
  const files = await fs.readdir(filesPath);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  for (const json of jsonFiles) {
    const jsonPath = path.join(filesPath, json);
    const preRandom = randomUUID();
    const jsonContent = await fs.readFile(jsonPath, "utf8");
    const jsonParsed = JSON.parse(jsonContent);
    jsonParsed.image = `${preRandom}.png`;
    await fs.writeFile(jsonPath, JSON.stringify(jsonParsed, null, 2));
    await fs.rename(jsonPath, path.join(filesPath, `${preRandom}.json`));
    await fs.rename(
      jsonPath.replace(".json", ".png"),
      path.join(filesPath, `${preRandom}.png`)
    );
  }
};

const reorder = async (filesPath: string) => {
  const files = await fs.readdir(filesPath);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  for (const [index, json] of jsonFiles.entries()) {
    const jsonPath = path.join(filesPath, json);
    const jsonContent = await fs.readFile(jsonPath, "utf8");
    const jsonParsed = JSON.parse(jsonContent);
    jsonParsed.image = `${index}.png`;
    await fs.writeFile(jsonPath, JSON.stringify(jsonParsed, null, 2));
    await fs.rename(jsonPath, path.join(filesPath, `${index}.json`));
    await fs.rename(
      jsonPath.replace(".json", ".png"),
      path.join(filesPath, `${index}.png`)
    );
  }
};

export const createShuffleCommand =
  () =>
  async ({ path }: ShuffleCommandInput) => {
    const spinner = ora("Shuffling images...").start();
    await shuffle(path);
    spinner.succeed("Shuffling images... done");
    spinner.start("Reordering images...");
    await reorder(path);
    spinner.succeed("Reordering images... done");
    ora;
  };
