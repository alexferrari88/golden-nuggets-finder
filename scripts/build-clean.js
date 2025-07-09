#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Clean up previous build files from root
const filesToMove = [
  'content.*.js',
  'popup.*.js', 
  'options.*.js',
  'popup.html',
  'options.html',
  'manifest.json',
  'icon*.plasmo.*.png'
];

console.log('🔄 Building extension...');
execSync('plasmo build', { stdio: 'inherit' });

console.log('🧹 Cleaning up build files from root directory...');

// Find and move files to dist directory
const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Get all files in root directory
const allFiles = fs.readdirSync(rootDir);

// Files to move based on pattern
const buildFiles = allFiles.filter(file => {
  return file.match(/^(content|popup|options)\.\w+\.js$/) || 
         file.match(/^icon\d+\.plasmo\.\w+\.png$/) ||
         file === 'manifest.json' ||
         file === 'popup.html' ||
         file === 'options.html';
});

console.log(`Found ${buildFiles.length} build files to move:`);
buildFiles.forEach(file => {
  console.log(`  - ${file}`);
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);
  fs.renameSync(srcPath, destPath);
});

console.log('✅ Build complete! Files moved to dist/ directory.');