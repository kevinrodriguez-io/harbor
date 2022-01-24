import images from "images";

const getItemFormat = (outputFormat: string) => {
  let itemFormat = images.TYPE.TYPE_JPEG;
  switch (outputFormat) {
    case "png":
      itemFormat = images.TYPE.TYPE_PNG;
      break;
    case "jpeg":
      itemFormat = images.TYPE.TYPE_JPEG;
      break;
    case "webp":
      itemFormat = images.TYPE.TYPE_WEBP;
      break;
    default:
      itemFormat = images.TYPE.TYPE_JPEG;
      break;
  }
  return itemFormat;
};

(async () => {
  const [_, __, item, outputFormat, outputPath, background, ...items] =
    process.argv;
  const image = images(background);
  // Sort the items array, if the first item is "Skins", put it first
  for (const item of items) {
    image.draw(images(item), 0, 0);
  }

  let itemFormat = getItemFormat(outputFormat);

  await new Promise<void>((resolve, reject) => {
    image.saveAsync(
      `${outputPath}/${item}.${outputFormat}`,
      itemFormat,
      { quality: 90 },
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
