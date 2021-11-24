import * as Web3 from "@solana/web3.js";
import fs from "fs/promises";
import Ora from "ora";

type CreateDonateCommandInput = {
  solanaKeypair: string;
  rpc: string;
  amount: string;
};

export const createDonateCommand = () => async (options: CreateDonateCommandInput) => {
  const destinationPublicKey = new Web3.PublicKey(
    "FeikG7Kui7zw8srzShhrPv2TJgwAn61GU7m8xmaK9GnW"
  );
  const { solanaKeypair, rpc, amount: preAmount } = options;
  const amount = parseFloat(preAmount);
  const spinner = Ora().start(`Reading keypair`);
  const connection = new Web3.Connection(rpc, { commitment: "confirmed" });
  const keyPairContents = await fs.readFile(solanaKeypair, "utf8");
  spinner.succeed();
  const keyPairSecret = JSON.parse(keyPairContents) as number[];
  const sourceWallet = Web3.Keypair.fromSecretKey(
    Uint8Array.from(keyPairSecret)
  );
  spinner.start(`Getting recent block hash`);
  const recentBlockhash = await connection.getRecentBlockhash();
  spinner.succeed(`Got: ${recentBlockhash.blockhash}`);
  spinner.start(
    `Sending ${
      amount / Web3.LAMPORTS_PER_SOL
    } LAMPORTS from ${sourceWallet.publicKey.toBase58()} to ${destinationPublicKey.toBase58()}`
  );
  const transaction = new Web3.Transaction({
    recentBlockhash: recentBlockhash.blockhash,
    feePayer: sourceWallet.publicKey,
  }).add(
    Web3.SystemProgram.transfer({
      fromPubkey: sourceWallet.publicKey,
      lamports: amount / Web3.LAMPORTS_PER_SOL,
      programId: Web3.SystemProgram.programId,
      toPubkey: destinationPublicKey,
    })
  );
  const result = await connection.sendTransaction(transaction, [sourceWallet]);
  spinner.succeed(`Sent, TX: https://solscan.io/tx/${result}`);
};
