import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const originalInputPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\29d7b4da-9ca1-4bd0-b6c2-0928f736bf04\\media__1781672165634.png';
const outputPath = 'c:\\Users\\User\\OneDrive\\Desktop\\SASE PROJECT\\RIDERSBUD APP\\RidersBUD App\\public\\riders-logo.png';

async function run() {
  const inputPath = fs.existsSync(originalInputPath) ? originalInputPath : outputPath;
  console.log(`Processing image from ${inputPath}...`);
  
  const image = sharp(inputPath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  
  console.log(`Image dimensions: ${width}x${height}, channels: ${channels}`);

  const visited = new Uint8Array(width * height);
  const queue = [];

  function addIfWhite(x, y) {
    const idx = y * width + x;
    if (visited[idx]) return;
    
    const i = idx * channels;
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Check if pixel is white/near-white
    if (r > 200 && g > 200 && b > 200) {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  // Add all border pixels to the queue
  for (let x = 0; x < width; x++) {
    addIfWhite(x, 0);
    addIfWhite(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    addIfWhite(0, y);
    addIfWhite(width - 1, y);
  }

  // BFS to find all connected background pixels
  let head = 0;
  const dx = [1, -1, 0, 0];
  const dy = [0, 0, 1, -1];

  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    for (let d = 0; d < 4; d++) {
      const nx = cx + dx[d];
      const ny = cy + dy[d];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        addIfWhite(nx, ny);
      }
    }
  }

  // Process pixels based on BFS results
  let transparentCount = 0;
  let preservedWhiteCount = 0;
  let orangeCount = 0;

  for (let idx = 0; idx < width * height; idx++) {
    const i = idx * channels;
    
    if (visited[idx]) {
      // Border-connected white pixel -> Background (make transparent)
      data[i+3] = 0;
      transparentCount++;
    } else {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      if (r > 200 && g > 200 && b > 200) {
        // White pixel NOT connected to border -> Keep white (this is the "Bud" text!)
        data[i] = 255;
        data[i+1] = 255;
        data[i+2] = 255;
        data[i+3] = 255; // Solid opaque white
        preservedWhiteCount++;
      } else if (r > 200 && g > 100 && b < 50) {
        orangeCount++;
      }
    }
  }

  console.log(`Background removal stats:`);
  console.log(`- Converted ${transparentCount} border-connected white pixels to transparent.`);
  console.log(`- Preserved ${preservedWhiteCount} inner white pixels (RidersBUD text).`);
  console.log(`- Detected ${orangeCount} orange pixels.`);
  console.log(`Saving to ${outputPath}...`);

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
  .png()
  .toFile(outputPath);
  
  console.log('Logo processed successfully!');
}

run().catch(console.error);

