#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting deployment process...\n');

try {
  // Check if we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Error: Not in a git repository');
    process.exit(1);
  }

  // Check if there are any uncommitted changes
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('⚠️  Warning: You have uncommitted changes');
      console.log('📝 Uncommitted files:');
      console.log(status);
      console.log('Consider committing your changes before deploying.\n');
    }
  } catch (error) {
    console.log('⚠️  Could not check git status\n');
  }

  // Install dependencies if node_modules doesn't exist
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  }

  // Run linting
  console.log('🔍 Running linter...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('✅ Linting passed\n');
  } catch (error) {
    console.log('⚠️  Linting failed, but continuing with deployment\n');
  }

  // Deploy to GitHub Pages (this will automatically run predeploy -> build first)
  console.log('🌐 Deploying to GitHub Pages (building first via predeploy)...');
  execSync('npm run deploy', { stdio: 'inherit' });
  console.log('✅ Deployment completed successfully!\n');

  // Get repository info for the final URL
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const repoMatch = remoteUrl.match(/github\.com[:/](.+?)\.git$/);
    if (repoMatch) {
      const [, repoPath] = repoMatch;
      console.log(`🎉 Your site should be available at: https://${repoPath.split('/')[0]}.github.io/${repoPath.split('/')[1]}/`);
    }
  } catch (error) {
    console.log('🎉 Deployment completed! Check your GitHub Pages settings for the URL.');
  }

  console.log('\n🎊 Deployment process finished successfully!');

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
} 