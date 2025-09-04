#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

console.log('🔄 Building extension...');
execSync('plasmo build', { stdio: 'inherit' });

console.log('🔧 Moving build files to dist/ directory...');

// Remove and recreate dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Files to move from root to dist
const buildFiles = [
  'manifest.json',
  'content.dbcead7d.js',
  'popup.b1682ec7.js', 
  'options.83833332.js',
  'popup.html',
  'options.html'
];

// Icon files (with pattern matching)
const allFiles = fs.readdirSync(rootDir);
const iconFiles = allFiles.filter(file => file.match(/^icon\d+\.plasmo\.\w+\.png$/));
buildFiles.push(...iconFiles);

// Move build files to dist
buildFiles.forEach(file => {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);
  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
    console.log(`  - Moved ${file} to dist/`);
  }
});

// Move static directory to dist
const staticSrc = path.join(rootDir, 'static');
const staticDest = path.join(distDir, 'static');
if (fs.existsSync(staticSrc)) {
  fs.renameSync(staticSrc, staticDest);
  console.log('  - Moved static/ to dist/');
}

// Copy Readability.js to dist for web_accessible_resources
const readabilitySrc = path.join(rootDir, 'public', 'Readability.js');
const readabilityDest = path.join(distDir, 'Readability.js');
if (fs.existsSync(readabilitySrc)) {
  fs.copyFileSync(readabilitySrc, readabilityDest);
  console.log('  - Copied Readability.js to dist/');
}

// Ensure manifest.json in dist/ has all required fields
const manifestPath = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Ensure name and description are properly set
  if (!manifest.name || manifest.name === '') {
    manifest.name = 'Golden Nugget Finder';
  }
  if (!manifest.description || manifest.description === '') {
    manifest.description = 'Extract high-value insights from web content using AI';
  }
  
  // Ensure permissions are present
  if (!manifest.permissions) {
    manifest.permissions = ['activeTab', 'storage', 'contextMenus'];
  }
  
  // Write the updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('  - Updated manifest.json with required fields');
}

console.log('✅ Build complete! All files organized in dist/ directory, root is clean.');