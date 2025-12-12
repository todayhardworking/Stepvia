require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '../dist');
const SECRET_patterns = [
    /AIza[0-9A-Za-z-_]{35}/g, // Google API Key format (Global flag to catch all)
    /GEMINI_API_KEY/,        // Env var name
    /process\.env\.GEMINI/,  // Env injection
    /firebase-admin/,        // Server-side lib leakage
];

// Whitelist the public Firebase Key
const ALLOWED_KEYS = [
    process.env.VITE_FIREBASE_API_KEY
].filter(Boolean);

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
                const matches = content.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        // Check if the match is whitelisted
                        if (ALLOWED_KEYS.includes(match)) {
                            console.log(`Ignoring allowed public key in ${path.basename(filePath)}`);
                            continue;
                        }

                        console.error(`UNKNOWN SECRET PATTERN FOUND in ${filePath}: ${match}`);
                        errorFound = true;
                    }
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
