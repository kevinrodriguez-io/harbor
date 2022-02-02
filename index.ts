#!/usr/bin/env node

import { program } from "commander";
import path from "path";
import { createLogger } from "./src/lib/logger.js";
import {
  AnimationInput,
  createUploaderCommand,
  ImageInput,
} from "./src/commands/upload.js";
import { createShuffleCommand } from "./src/commands/shuffle.js";
import { createFixMissingPostMintCommand } from "./src/commands/fixMissingPostMint.js";
import { createDonateCommand } from "./src/commands/donate.js";
import { createDropToHoldersCommand } from "./src/commands/dropToHolders.js";
import { createBuildLayersJSONCommand } from "./src/commands/buildLayersJSON.js";
import { createGenerateArtCommand } from "./src/commands/generateArt.js";
import { createBuildSpecificArtCommand } from "./src/commands/createSpecificArt.js";

const __dirname = path.resolve();

const logger = createLogger(path.join(__dirname, "journal.log"));
const pseudoCachePath = path.join(__dirname, "pseudo-cache.json");

program.version("0.0.1");

program
  .command("donate")
  .description(
    "Donate to the developer (FeikG7Kui7zw8srzShhrPv2TJgwAn61GU7m8xmaK9GnW), devnet tokens accepted too."
  )
  .requiredOption("-s, --solana-keypair <solanaKeypair>", "Solana Keypair")
  .requiredOption(
    "-a, --amount <amount>",
    "Amount of sol to donate (Not in lamports)"
  )
  .option("-r, --rpc <rpc>", "RPC to use.", "https://api.devnet.solana.com")
  .action(createDonateCommand());

program
  .command("shuffle")
  .description("Little helper to shuffle Candy Machine pair files.")
  .requiredOption("-p, --path <filesPath>", "Files Path")
  .action(createShuffleCommand());

program
  .command("upload")
  .description(
    "Uploads the pair files (Candy-machine style) in the files path into Arweave using parallelization."
  )
  .requiredOption("-k, --key <jwk>", "JWK For Arweave")
  .requiredOption("-p, --path <filesPath>", "Files Path")
  .option(
    "-i, --imageFormat <imageFormat>",
    "Specify the image format (Defaults to .png)",
    "png" as ImageInput
  )
  .option(
    "-a, --animatedFormat <animatedFormat>",
    "If animated, uploads an animation for each file. (Defaults to none)",
    "none" as AnimationInput
  )
  .option("-s, --sequential <sequential>", "Sequential")
  .option("-r, --retries <retries>", "Retries", "5")
  .option("-t, --threads <threads>", "Threads to use (Parallelization)", "10")
  .action(createUploaderCommand(logger, pseudoCachePath));

/**
 * TODO: Check candy machine mints instead of checking pseudo-cache.json
 */
program
  .command("fix_missing_post_mint")
  .description(
    "Takes files in a pseudo-cache and checks they're good on Arweave. If anything is broken(404) it will fix it."
  )
  .requiredOption("-p, --path <filesPath>", "Files Path")
  .requiredOption("-k, --key <jwk>", "JWK For Arweave")
  .requiredOption("-s, --solana-keypair <solanaKeypair>", "Solana Keypair")
  .requiredOption("-i, --id <candyMachineId>", "Candy machine identifier")
  .requiredOption("-c, --cache <cache>", "PseudoCache file")
  .option(
    "-r, --rpc <rpc>",
    "Solana RPC To Use",
    "https://api.devnet.solana.com"
  )
  .option("-t, --threads <threads>", "Threads to use (Parallelization)", "10")
  .action(createFixMissingPostMintCommand(logger));

program
  .command("drop_to_holders")
  .description(
    "Similar to a Candy-Machine drop, but instead of creating a candy machine, it mints and airdrops directly to a Candy Machine set of Holders over the air."
  )
  .requiredOption("-p, --path <filesPath>", "Files Path")
  .requiredOption("-k, --key <jwk>", "JWK For Arweave")
  .requiredOption("-s, --solana-keypair <solanaKeypair>", "Solana Keypair")
  .requiredOption("-i, --id <candyMachineId>", "Candy machine identifier")
  .requiredOption(
    "-f, --snapshotFile <snapshotFile>",
    "Candy machine holder snapshot file path"
  )
  .option("-c, --cache <cache>", "Cache file to use", "drop-cache.json")
  .option(
    "-r, --rpc <rpc>",
    "Solana RPC To Use",
    "https://api.devnet.solana.com"
  )
  .option("-t, --threads <threads>", "Threads to use (Parallelization)", "10")
  .option("-k, --retries <retries>", "Retries", "5")
  .action(createDropToHoldersCommand(logger));

program
  .command("build_layers_json")
  .requiredOption("-p, --path <path>", "Input layers folders path")
  .requiredOption(
    "-o, --output <output>",
    "Output file to write",
    "layers.json"
  )
  .action(createBuildLayersJSONCommand(logger));

program
  .command("generate_art")
  .requiredOption(
    "-j, --json-template-path <jsonTemplatePath>",
    "JSON Template Input Path"
  )
  .requiredOption(
    "-l, --layers-config-path <layersConfigPath>",
    "Layers configuration path"
  )
  .requiredOption("-p, --layers-path <layersPath>", "Path of the layers folder")
  .requiredOption("-o, --output-path <outputPath>", "Path to write files into")
  .requiredOption("-a, --amount <amount>", "Amount of entries to generate")
  .requiredOption(
    "-f, --output-format <outputFormat>",
    "Output format (jpeg, png, webp)"
  )
  .action(createGenerateArtCommand(logger));

program
  .command("create_specific_art")
  .requiredOption(
    "-j, --json-template-path <jsonTemplatePath>",
    "JSON Template Input Path"
  )
  .requiredOption(
    "-l, --picked-layers-path <pickedLayersPath>",
    "Picked layers json Path"
  )
  .requiredOption("-p, --layers-path <layersPath>", "Path of the layers folder")
  .requiredOption("-o, --output-path <outputPath>", "Path to write files into")
  .requiredOption("-i, --item-number <itemNumber>", "Element number")
  .requiredOption(
    "-f, --output-format <outputFormat>",
    "Output format (jpeg, png, webp)"
  )
  .action(createBuildSpecificArtCommand(logger));

program.parse(process.argv);
