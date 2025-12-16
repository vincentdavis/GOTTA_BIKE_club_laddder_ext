#!/usr/bin/env node
/**
 * Build script for GOTTA.BIKE ladder Chrome extension
 * - Bumps version number (minor by default)
 * - Creates zip with versioned filename
 * - Ensures unzipped folder is named "GOTTA_BIKE_ladder"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const BUILD_DIR = path.join(ROOT_DIR, 'build');
const MANIFEST_PATH = path.join(SRC_DIR, 'manifest.json');

// Read manifest
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const currentVersion = manifest.version;

// Bump version (minor version by default)
function bumpVersion(version, type = 'minor') {
  const parts = version.split('.').map(Number);

  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2]++;
      break;
  }

  return parts.join('.');
}

// Get bump type from command line args
const bumpType = process.argv[2] || 'minor';
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Invalid bump type. Use: major, minor, or patch');
  process.exit(1);
}

const newVersion = bumpVersion(currentVersion, bumpType);

console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);

// Update manifest with new version
manifest.version = newVersion;
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

// Update package.json version too
const packagePath = path.join(ROOT_DIR, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

// Clean and create build directory
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Create temp directory with correct name for zip
const tempDir = path.join(BUILD_DIR, 'GOTTA_BIKE_ladder');
fs.mkdirSync(tempDir, { recursive: true });

// Copy src contents to temp directory
function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.name === '.DS_Store') continue;

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(SRC_DIR, tempDir);

// Create zip file
const zipFileName = `GOTTA_BIKE_ladder_${newVersion}.zip`;
const zipPath = path.join(BUILD_DIR, zipFileName);

console.log(`Creating ${zipFileName}...`);

// Use zip command (cd to build dir so folder name is preserved in zip)
execSync(`cd "${BUILD_DIR}" && zip -r "${zipFileName}" GOTTA_BIKE_ladder`, {
  stdio: 'inherit'
});

// Clean up temp directory
fs.rmSync(tempDir, { recursive: true });

console.log(`\nBuild complete!`);
console.log(`  Version: ${newVersion}`);
console.log(`  Output: build/${zipFileName}`);
console.log(`\nTo load in Chrome:`);
console.log(`  1. Unzip build/${zipFileName}`);
console.log(`  2. Load the "GOTTA_BIKE_ladder" folder as unpacked extension`);
