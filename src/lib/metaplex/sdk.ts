import { PublicKey } from "@solana/web3.js";
import { deserializeUnchecked } from "borsh";
import { Metadata, METADATA_SCHEMA } from "./types.js";

export const METAPLEX_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

export const getMetadataPDA = async (publicKey: PublicKey) => {
  const metaplexPubkey = new PublicKey(METAPLEX_PROGRAM_ID);
  const seeds = [
    Buffer.from("metadata"),
    metaplexPubkey.toBuffer(),
    publicKey.toBuffer(),
  ];
  const [pda] = await PublicKey.findProgramAddress(seeds, metaplexPubkey);
  return pda;
};

// eslint-disable-next-line no-control-regex
const METADATA_REPLACE = new RegExp("\u0000", "g");

export const decodeMetadata = (buffer: Buffer): Metadata => {
  const metadata = deserializeUnchecked(
    METADATA_SCHEMA,
    Metadata,
    buffer
  ) as Metadata;
  metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, "");
  metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, "");
  metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, "");
  return metadata;
};
