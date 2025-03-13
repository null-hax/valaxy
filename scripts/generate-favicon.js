const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Install svg2ico if not already installed
try {
  console.log('Checking for svg2ico...');
  execSync('npm list -g svg2ico', { stdio: 'ignore' });
  console.log('svg2ico is already installed.');
} catch (error) {
  console.log('Installing svg2ico...');
  execSync('npm install -g svg2ico');
  console.log('svg2ico installed successfully.');
}

// Paths
const svgPath = path.join(__dirname, '..', 'public', 'blooddrop.svg');
const icoPath = path.join(__dirname, '..', 'app', 'favicon.ico');

// Check if SVG exists
if (!fs.existsSync(svgPath)) {
  console.error(`Error: SVG file not found at ${svgPath}`);
  process.exit(1);
}

// Convert SVG to ICO
try {
  console.log('Converting SVG to ICO...');
  execSync(`svg2ico ${svgPath} ${icoPath} -s 16,32,48`);
  console.log(`Favicon successfully generated at ${icoPath}`);
} catch (error) {
  console.error('Error converting SVG to ICO:', error.message);
  
  // Alternative approach using a different package if svg2ico fails
  console.log('Trying alternative approach...');
  try {
    // Install svg-to-ico if needed
    execSync('npm install -g svg-to-ico');
    execSync(`svg-to-ico ${svgPath} ${icoPath}`);
    console.log(`Favicon successfully generated using alternative method at ${icoPath}`);
  } catch (altError) {
    console.error('Alternative approach failed:', altError.message);
    console.log('\nManual instructions:');
    console.log('1. Visit https://convertio.co/svg-ico/');
    console.log('2. Upload the SVG file from public/blooddrop.svg');
    console.log('3. Download the converted ICO file');
    console.log('4. Replace app/favicon.ico with the downloaded file');
  }
}