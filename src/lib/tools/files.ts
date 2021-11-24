import { readdir } from "fs/promises";

export const getHighestFileNumber = async (path: string) => {
  const files = await readdir(path);
  const [highestNumber] = [
    ...new Set(
      files.map((f) => parseInt(f.replace(".json", "").replace(".png", "")))
    ),
  ].sort((a, b) => b - a);
  return highestNumber;
};
