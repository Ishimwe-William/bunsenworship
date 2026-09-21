const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const validTypes = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];
const rawArg = process.argv[2] ? process.argv[2].toLowerCase() : 'patch';

// Allow flexible inputs like "minor", "release:minor", "--minor"
const type = rawArg.replace(/^--?/, '').replace(/^release:/, '');

if (!validTypes.includes(type)) {
  console.error(`❌ Invalid release type "${rawArg}". Valid options are: ${validTypes.join(', ')}`);
  console.error('Usage:');
  console.error('  npm run release          (default: patch -> e.g. 1.0.1 to 1.0.2)');
  console.error('  npm run release minor    (minor -> e.g. 1.0.1 to 1.1.0)');
  console.error('  npm run release major    (major -> e.g. 1.0.1 to 2.0.0)');
  process.exit(1);
}

// Ensure git working directory is clean
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (gitStatus.length > 0) {
    console.error('❌ Git working directory is not clean. Please commit or stash changes before releasing:');
    console.error(gitStatus);
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Failed to check git status:', err.message);
  process.exit(1);
}

console.log(`🚀 Bumping version (${type})...`);

try {
  // Execute npm version: updates package.json and package-lock.json, commits, and creates git tag
  const newTag = execSync(`npm version ${type} -m "Release v%s"`, { encoding: 'utf8' }).trim();
  console.log(`🏷️ Created tag: ${newTag}`);

  // Push commit and tag to origin master
  console.log('📤 Pushing commits and tags to GitHub...');
  execSync('git push origin master --follow-tags', { stdio: 'inherit' });

  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  console.log(`\n🎉 Successfully published release v${pkg.version}!`);
  console.log(`🔗 GitHub Actions is now building and publishing installers to release ${newTag}.`);
  console.log('🌐 Track progress: https://github.com/Ishimwe-William/bunsenworship/actions\n');
} catch (error) {
  console.error('❌ Release failed:', error.message);
  process.exit(1);
}
