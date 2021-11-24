import { writeFile } from "fs/promises";
import { Logger } from "./types/Logger";

export const createLogger = (journal: string): Logger => {
  const log = (...args: any[]) => {
    console.log(...args);
    return writeFile(
      journal,
      `${new Date().toISOString()} ${args.join(" ")}\n`,
      {
        flag: "a",
      }
    );
  };
  return {
    log,
    error: (...args: any[]) => {
      console.error(...args);
      return writeFile(
        journal,
        `${new Date().toISOString()} ${args.join(" ")}\n`,
        {
          flag: "a",
        }
      );
    },
  };
};
