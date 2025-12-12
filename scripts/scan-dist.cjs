const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '../dist');
const SECRET_patterns = [
    /AIza[0-9A-Za-z-_]{35}/, // Google API Key format
    /GEMINI_API_KEY/,        // Env var name
    /process\.env\.GEMINI/,  // Env injection
    /firebase-admin/,        // Server-side lib leakage
];

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.warn(`Directory not found: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);
    let errorFound = false;

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (scanDirectory(filePath)) errorFound = true;
        } else if (file.endsWith('.js') || file.endsWith('.html')) {
            const content = fs.readFileSync(filePath, 'utf8');

            for (const pattern of SECRET_patterns) {
                if (pattern.test(content)) {
                    console.error(`UNKNOWN SECRET PATTERN FOUND in ${filePath}: ${pattern}`);
                    errorFound = true;
                }
            }
        }
    }
    return errorFound;
}

console.log('--- STARTING SECRET SCAN ---');
const foundSecrets = scanDirectory(DIST_DIR);

if (foundSecrets) {
    console.error('!!! SECRETS DETECTED IN BUILD OUTPUT. BUILD FAILED !!!');
    process.exit(1);
} else {
    console.log('--- SCAN PASSED: No secrets found in dist/ ---');
}
