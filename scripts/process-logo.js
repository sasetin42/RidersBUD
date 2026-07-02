import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const originalInputPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\29d7b4da-9ca1-4bd0-b6c2-0928f736bf04\\media__1781672165634.png';
const outputPath = 'c:\\Users\\User\\OneDrive\\Desktop\\SASE PROJECT\\RIDERSBUD APP\\RidersBUD App\\public\\riders-logo.png';

async function run() {
  const inputPath = fs.existsSync(originalInputPath) ? originalInputPath : outputPath;
  console.log(`Copying original logo from ${inputPath} to ${outputPath}...`);
  
  if (inputPath === outputPath) {
    console.log("Input and output are the same. No copy needed.");
    return;
  }
  
  fs.copyFileSync(inputPath, outputPath);
  console.log('Logo copied successfully!');
}

run().catch(console.error);

