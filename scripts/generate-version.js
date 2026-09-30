const fs = require('fs'); // eslint-disable-line @typescript-eslint/no-require-imports
const path = require('path'); // eslint-disable-line @typescript-eslint/no-require-imports

function readPackageVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const version = packageJson.version;
  
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format in package.json: ${version}`);
  }
  
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  };
}

function updatePackageVersion(version) {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  packageJson.version = version.replace(/^v/, '');
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✅ Updated package.json version');
}

function saveVersion(version) {
  const versionFilePath = path.join(process.cwd(), '.version');
  fs.writeFileSync(versionFilePath, version.replace(/^v/, ''));
}

function generateVersion() {
  const current = readPackageVersion();
  
  const isAutoBump = process.env.AUTO_BUMP === 'true';
  const newVersion = isAutoBump ? {
    major: current.major,
    minor: current.minor,
    patch: current.patch + 1
  } : {
    major: current.major,
    minor: current.minor,
    patch: current.patch
  };
  
  const version = `v${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
  const timestamp = new Date().toISOString();
  const buildDate = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  
  updatePackageVersion(version);
  saveVersion(version);
  
  return {
    version,
    timestamp,
    buildDate,
    versionNumber: newVersion
  };
}

function updateEnvFile(versionInfo) {
  const envPath = path.join(process.cwd(), '.env.production');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  const versionLine = `NEXT_PUBLIC_APP_VERSION=${versionInfo.version}`;
  const timestampLine = `NEXT_PUBLIC_BUILD_TIME=${versionInfo.timestamp}`;
  
  if (envContent.includes('NEXT_PUBLIC_APP_VERSION=')) {
    envContent = envContent.replace(/NEXT_PUBLIC_APP_VERSION=.*/g, versionLine);
  } else {
    envContent += `\n${versionLine}`;
  }
  
  if (envContent.includes('NEXT_PUBLIC_BUILD_TIME=')) {
    envContent = envContent.replace(/NEXT_PUBLIC_BUILD_TIME=.*/g, timestampLine);
  } else {
    envContent += `\n${timestampLine}`;
  }
  
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log('✅ Updated .env.production with new version');
}

function createVersionFile(versionInfo) {
  const versionFilePath = path.join(process.cwd(), 'public', 'version.json');
  
  const versionData = {
    version: versionInfo.version,
    buildTime: versionInfo.timestamp,
    buildDate: versionInfo.buildDate,
    environment: process.env.NODE_ENV || 'production'
  };
  
  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));
  console.log('✅ Created public/version.json');
}

function createVersionApiRoute(versionInfo) {
  const apiRoutePath = path.join(process.cwd(), 'app', 'api', 'system', 'version');
  
  if (!fs.existsSync(apiRoutePath)) {
    fs.mkdirSync(apiRoutePath, { recursive: true });
  }
  
  const routeContent = `import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    version: '${versionInfo.version}',
    buildTime: '${versionInfo.timestamp}',
    buildDate: '${versionInfo.buildDate}',
    environment: process.env.NODE_ENV || 'production',
  });
}
`;
  
  fs.writeFileSync(path.join(apiRoutePath, 'route.ts'), routeContent);
  console.log('✅ Created API route: /api/system/version');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'reset' || command === 'set') {
    const target = args[1] || '0.0.1';
    console.log(`🔄 Setting version to ${target}...\n`);
    
    const version = `v${target.replace(/^v/, '')}`;
    updatePackageVersion(version);
    saveVersion(version);
    
    const versionInfo = {
      version,
      timestamp: new Date().toISOString(),
      buildDate: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };
    updateEnvFile(versionInfo);
    createVersionFile(versionInfo);
    createVersionApiRoute(versionInfo);
    
    console.log(`✅ Version set to: ${version}\n`);
    return;
  }
  
  console.log('🚀 Generating version info...\n');
  
  const versionInfo = generateVersion();
  
  console.log('📦 Version Info:');
  console.log(`   Version: ${versionInfo.version}`);
  console.log(`   Build Time: ${versionInfo.buildDate}`);
  console.log('');
  
  updateEnvFile(versionInfo);
  createVersionFile(versionInfo);
  createVersionApiRoute(versionInfo);
  
  console.log('\n✨ Version generation completed!');
  console.log(`📌 Current version: ${versionInfo.version}\n`);
}

main();
