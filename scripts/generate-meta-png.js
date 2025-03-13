const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Install required packages if not already installed
try {
  console.log('Installing required packages...');
  execSync('npm install sharp');
  console.log('Packages installed successfully.');
} catch (error) {
  console.error('Error installing packages:', error.message);
  process.exit(1);
}

// Import sharp after installation
const sharp = require('sharp');

// Paths
const svgPath = path.join(__dirname, '..', 'public', 'blooddrop-meta.svg');
const pngPath = path.join(__dirname, '..', 'public', 'blooddrop-meta.png');

// Check if SVG exists
if (!fs.existsSync(svgPath)) {
  console.error(`Error: SVG file not found at ${svgPath}`);
  process.exit(1);
}

// Read SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Convert SVG to PNG
console.log('Converting SVG to PNG...');
sharp(svgBuffer)
  .resize(1200, 630) // Twitter/OG recommended size
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log(`PNG file successfully generated at ${pngPath}`);
  })
  .catch(err => {
    console.error('Error converting SVG to PNG:', err);
    
    // Alternative approach if sharp fails
    console.log('\nIf the conversion failed, you can try these alternatives:');
    console.log('1. Use an online converter: https://convertio.co/svg-png/');
    console.log('2. Open the SVG in a browser and take a screenshot');
    console.log('3. Use a graphics editor like Inkscape, Illustrator, or GIMP');
  });