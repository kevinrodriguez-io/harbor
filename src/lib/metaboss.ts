import util from "util";
import { exec } from "child_process";
import { readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import mkdirp from "mkdirp";
import { randomUUID } from "crypto";

const execPromisified = util.promisify(exec);

export const downloadMintsFile = async (
  rpc: string,
  outPath: string,
  candyMachineId: string
) => {
  // Try to create outPath folder if it doesn't exist
  try {
    await mkdirp(outPath);
  } catch (e) {
    // Do nothing
  }
  const { stderr } = await execPromisified(
    `metaboss -r ${rpc} snapshot mints -c ${candyMachineId} -o ${outPath}`
  );
  if (stderr) {
    throw new Error(stderr);
  }
};

export const readDownloadedMintsFile = async (
  outPath: string,
  candyMachineId: string
) => {
  const mintAccounts = await readFile(
    path.join(outPath, `${candyMachineId}_mint_accounts.json`),
    "utf-8"
  );
  return JSON.parse(mintAccounts) as string[];
};

export const decodeMintsFile = async (
  rpc: string,
  mintFileName: string,
  decodedMintPath: string,
  outPath: string
) => {
  // Try to create outPath folder if it doesn't exist
  try {
    await mkdirp(outPath);
  } catch (e) {
    // Do nothing
  }
  const { stderr } = await execPromisified(
    `metaboss -r ${rpc} decode mint -l ${path.resolve(
      decodedMintPath,
      mintFileName
    )} -o ${outPath}`
  );
  if (stderr) {
    throw new Error(stderr);
  }
};

export const findMintForNFTName = async (
  nftName: string,
  decodedMintsFolder: string
) => {
  const files = await readdir(decodedMintsFolder);
  for (const file of files) {
    const decoded = await readFile(
      path.join(decodedMintsFolder, file),
      "utf-8"
    );
    const decodedMint = JSON.parse(decoded);
    if (decodedMint.data.name === nftName) {
      return file.replace(".json", "");
    }
  }
  return null;
};

export const updateNFTUri = async (
  rpc: string,
  mint: string,
  keyPair: string,
  newUri: string
) => {
  const { stderr } = await execPromisified(
    `metaboss -r ${rpc} update uri -k ${keyPair} -a ${mint} -u ${newUri}`
  );
  if (stderr) {
    throw new Error(stderr);
  }
};

type NFTData = {
  name: string;
  symbol: string;
  uri: string;
  seller_fee_basis_points: number;
  creators: {
    address: string;
    verified: boolean;
    share: number;
  }[];
};

export const mintOneNFT = async (
  rpc: string,
  keyPair: string,
  receiver: string,
  tempFolder: string,
  nftData: NFTData
) => {
  try {
    await mkdirp(tempFolder);
    const fileName = `${randomUUID()}.json`;
    const fullFilePath = path.resolve(tempFolder, fileName);
    await writeFile(fullFilePath, JSON.stringify(nftData));
    const { stdout, stderr } = await execPromisified(
      `metaboss -r ${rpc} mint one -k ${keyPair} -d ${fullFilePath} -r ${receiver}`
    );
    if (stderr) {
      throw new Error(stderr);
    }
    return stdout;
  } catch (error: any) {
    throw new Error(error);
  }
};
