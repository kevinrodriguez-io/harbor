import fs from "fs/promises";

const pad = (n) =>
  n < 10 ? `000${n}` : n < 100 ? `00${n}` : n < 1000 ? `0${n}` : `${n}`;

const range = (n) =>
  Array(n)
    .fill()
    .map((_, i) => i);

const fixItem = async (itemName) => {
  const file1 = JSON.parse(await fs.readFile(`./JGCT/${itemName}`, "utf-8"));
  const cloned = JSON.parse(JSON.stringify(file1));
  // file1.name = `Glitched JungleCats #${pad(cloned.number)}`;
  // delete file1.number;
  // file1.description =
  //   "No cage can contain a JungleCat. There's been a major glitch, and the calm of the jungle has broken. The cats are awake, and they're about to make some noise.";
  // delete file1.fileName;
  // // file1.image = cloned.fileName;
  // file1.collection = {
  //   ...file1.collection,
  //   family: "JungleCats Stash",
  // };
  file1.properties = {
    ...cloned.properties,
    creators: [
      {
        address: "JCTSK3K3vbLxMMwphRrWjoJPYD3rZKur2KT6eS8Mv6Bd",
        share: 1,
      },
      {
        address: "GtV2CDg1S2k5ZJDRCNwErZLFNmK6PS7fx3GYeewCC7zg",
        share: 50,
      },
      {
        address: "daoXo7FeRBb4gonerEKhGB5X8rkC9ag16s7cspLYR9g",
        share: 49,
      },
    ],
  };
  await fs.writeFile(`./JGCT/${itemName}`, JSON.stringify(file1, null, 2));
};

(async () => {
  const files = await fs.readdir("./JGCT");
  const jsonFiles = files.filter((f) => f.endsWith("json"));
  for (const jsonFile of jsonFiles) {
      await fixItem(jsonFile);
  }
})();
