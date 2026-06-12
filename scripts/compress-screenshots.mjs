import sharp from 'sharp';
import { rename } from 'node:fs/promises';

const files = ['screenshot_animals', 'screenshot_fruits', 'screenshot_vegetables'];

for (const name of files) {
  const input = `docs/images/${name}.png`;
  const temp = `docs/images/${name}_temp.png`;
  console.log(`Compressing ${input}...`);
  await sharp(input)
    .resize({ width: 1000 })
    .png({ quality: 80, effort: 8 })
    .toFile(temp);
  await rename(temp, input);
}
console.log('Compression complete!');
