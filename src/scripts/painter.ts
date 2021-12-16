import images from "images";

(async () => {
  const [_, __, item, outputFormat, outputPath, background, ...items] =
    process.argv;
  const image = images(background);
  // Sort the items array, if the first item is "Skins", put it first
  for (const item of items) {
    image.draw(images(item), 0, 0);
  }
  await new Promise<void>((resolve, reject) => {
    image.saveAsync(
      `${outputPath}/${item}.${outputFormat}`,
      outputFormat === "jpeg" ? images.TYPE.TYPE_JPEG : images.TYPE.TYPE_PNG,
      {
        quality: 90,
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
})();
