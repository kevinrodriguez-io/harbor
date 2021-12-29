import { readdir } from "fs/promises";

export const getHighestFileNumber = async (path: string) => {
  const files = await readdir(path);
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
