import sharp from 'sharp';
import path from 'path';

const inputPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\29d7b4da-9ca1-4bd0-b6c2-0928f736bf04\\media__1781672165634.png';
const outputPath = 'c:\\Users\\User\\OneDrive\\Desktop\\SASE PROJECT\\RIDERSBUD APP\\RidersBUD App\\public\\riders-logo.png';

async function run() {
  console.log(`Processing image from ${inputPath}...`);
  const image = sharp(inputPath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  let transparentCount = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // If pixel is white/near-white, make it transparent
    if (r > 240 && g > 240 && b > 240) {
      data[i+3] = 0;
      transparentCount++;
    }
  }

  console.log(`Converted ${transparentCount} pixels to transparent. Saving to ${outputPath}...`);

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
  .png()
  .toFile(outputPath);
  
  console.log('Background removed successfully and transparent PNG saved!');
}

run().catch(console.error);
