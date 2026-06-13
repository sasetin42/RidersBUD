const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// Images to convert
const images = [
    { input: 'favicon.png', output: 'favicon.webp' },
    { input: 'riders-logo.png', output: 'riders-logo.webp' },
    { input: 'assets/admin_branding.png', output: 'assets/admin_branding.webp' }
];

async function convertToWebP() {
    console.log('🎨 Starting image conversion to WebP...\n');

    for (const img of images) {
        const inputPath = path.join(publicDir, img.input);
        const outputPath = path.join(publicDir, img.output);

        // Check if input file exists
        if (!fs.existsSync(inputPath)) {
            console.log(`⚠️  Skipping ${img.input} - file not found`);
            continue;
        }

        try {
            // Get original file size
            const originalStats = fs.statSync(inputPath);
            const originalSize = (originalStats.size / 1024).toFixed(2);

            // Convert to WebP
            await sharp(inputPath)
                .webp({ quality: 90, effort: 6 })
                .toFile(outputPath);

            // Get new file size
            const newStats = fs.statSync(outputPath);
            const newSize = (newStats.size / 1024).toFixed(2);
            const savings = ((1 - newStats.size / originalStats.size) * 100).toFixed(1);

            console.log(`✅ ${img.input}`);
            console.log(`   Original: ${originalSize} KB`);
            console.log(`   WebP: ${newSize} KB`);
            console.log(`   Savings: ${savings}%\n`);
        } catch (error) {
            console.error(`❌ Error converting ${img.input}:`, error.message);
        }
    }

    console.log('🎉 Image conversion complete!');
}

convertToWebP().catch(console.error);
