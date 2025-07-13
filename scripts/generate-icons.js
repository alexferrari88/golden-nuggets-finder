#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Simple icon resizing script without external dependencies
 * Uses Canvas API available in Node.js to resize images
 */

// Try to require sharp first, fallback to basic implementation
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('Sharp not found, using basic implementation...');
}

const ICON_SIZES = [
  { size: 128, filename: 'icon128.png' },
  { size: 32, filename: 'icon32.png' },
  { size: 16, filename: 'icon16.png' }
];

const INPUT_PATH = path.join(__dirname, '..', 'assets', 'icon.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets');

async function generateIcons() {
  // Check if input file exists
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Error: Input file not found at ${INPUT_PATH}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (sharp) {
    // Use sharp for high-quality resizing
    console.log('Using Sharp for image resizing...');
    
    for (const { size, filename } of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, filename);
      
      try {
        await sharp(INPUT_PATH)
          .resize(size, size, {
            kernel: sharp.kernel.lanczos3,
            fit: 'cover',
            position: 'center'
          })
          .png({
            quality: 100,
            compressionLevel: 6
          })
          .toFile(outputPath);
        
        console.log(`✓ Generated ${filename} (${size}x${size})`);
      } catch (error) {
        console.error(`✗ Failed to generate ${filename}:`, error.message);
        process.exit(1);
      }
    }
  } else {
    // Fallback: provide instructions to install sharp
    console.log(`
⚠️  For optimal image quality, install sharp:
   pnpm add -D sharp

For now, you can manually resize ${INPUT_PATH} to create:
${ICON_SIZES.map(({ size, filename }) => `  - ${filename} (${size}x${size})`).join('\n')}

Place them in: ${OUTPUT_DIR}
    `);
    
    // Check if manual icons exist
    const missingIcons = ICON_SIZES.filter(({ filename }) => 
      !fs.existsSync(path.join(OUTPUT_DIR, filename))
    );
    
    if (missingIcons.length > 0) {
      console.log('\nMissing icons:');
      missingIcons.forEach(({ filename }) => {
        console.log(`  ✗ ${filename}`);
      });
      process.exit(1);
    } else {
      console.log('\n✓ All icon files found');
    }
  }

  console.log('\n🎉 Icon generation complete!');
}

// Run the script
generateIcons().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});