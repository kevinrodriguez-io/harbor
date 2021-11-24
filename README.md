# Harbor

![Harbor](https://images.unsplash.com/photo-1589663639452-aa4f4b6331bc?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&h=300&w=1000&q=80)

Candy-Machine drop companion.

## Install from source:

```bash
$ git clone https://github.com/kevinrodriguez-io/harbor
$ cd harbor
$ yarn
$ yarn build
$ npm i -g .
```

## How to use:

Overall help:

```bash
$ harbor --help
```

### Using the `upload` Command:

Given an `arweave-jwk.json` file and a `files` folder that contains candy-machine
formatted pairs `[0.png, 0.json]` this uploads the given files to Arweave, uses
parallelization (10 by default), also retries up to 5 times. Additionally, it
will throw every time an image isn't found. (Thanks, Arweave).

🚨 IT IS VERY IMPORTANT FOR YOU TO CREATE YOUR CANDY
MACHINE CACHE FILE USING: 

```bash
$ node ./candy-machine-cli.js upload <dir1> -n <totalNFTNo> --keypair <keypair> --env <env>
```

Where `dir1` only contains 0.png and 0.json. This will create your cache file.

Then run:

```bash
$ harbor upload -k ./arweave-jwk.json -p ./files
```

This will generate a `pseudo-cache.json` file that you can merge with your
candy-machine cache file (Copy/paste items.)

Once you're ready to go, and after updating your cache file, run:

```bash
node ./candy-machine-cli.js upload <dir2> -n <totalNFTNo> --keypair <keypair> --env <env>
```

To upload everything.


### Using the `shuffle` command:

Assigns a random UUID to each pair in the given folder and then turns NFTs back
into numbers (candy-machine formatted pairs).

```bash
$ harbor shuffle -p ./files
```

### Using the `fix_missing_post_mint` command:

⚠️ THIS IS VERY EXPERIMENTAL ⚠️

Use this when your users complain about empty images in their NFTs.

First of all, you need to install `metaboss`: https://github.com/samuelvanderwaal/metaboss (You'd need to install `rust` and `cargo`).

This command will use your files folder as a reference. (The one you used when you created the Candy Machine).
Be sure to use your pseudo-cache.json file. If you don't have one, extract the `items` object from
the Candy-Machine cache file and paste it into a new file (Add wrapping `{}`s).

```bash
$ harbor fix_missing_post_mint \
-p ./files \
-k ./arweave-jwk.json \
-s ./solana-keypair.json \
-i FeikG7Kui7zw8srzShhrPv2TJgwAn61GU7m8xmaK9GnW \ # Candy machine address
-c ./pseudo-cache.json \
-r https://api.mainnet-beta.solana.com \
-t 10
```

### Author notes

Feel free to contact me.

Some day, someone will appreciate the work done on this project and will send some Sol at:
FeikG7Kui7zw8srzShhrPv2TJgwAn61GU7m8xmaK9GnW

- **Twitter:** https://twitter.com/MisterKevin_JS
- **Email:** _@kevinrodriguez.io
