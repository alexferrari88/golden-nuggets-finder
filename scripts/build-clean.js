#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Building extension...');
execSync('plasmo build', { stdio: 'inherit' });

console.log('🔧 Preparing files for packaging...');

const rootDir = process.cwd();

// Copy Readability.js to root for web_accessible_resources
const readabilitySrc = path.join(rootDir, 'public', 'Readability.js');
const readabilityDest = path.join(rootDir, 'Readability.js');
if (fs.existsSync(readabilitySrc)) {
  fs.copyFileSync(readabilitySrc, readabilityDest);
  console.log('  - Copied Readability.js to root');
} else {
  console.log('  - Warning: Readability.js not found in public/');
}

// Ensure manifest.json has all required fields
const manifestPath = path.join(rootDir, 'manifest.json');
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
} else {
  console.log('  - Warning: manifest.json not found');
}

console.log('✅ Build complete! Files ready for packaging.');