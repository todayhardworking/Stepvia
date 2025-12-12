# Security Policy

## 🔒 Secrets Management
1.  **Strict Separation**:
    *   **Public (Client)**: Variables prefixed with `VITE_`. Safe to be seen by users.
    *   **Private (Server)**: All other variables (API Keys, Admin Info). NEVER use in client code.
2.  **No Leaks**:
    *   We use a build script (`scripts/scan-dist.js`) to ensure no secrets accidentally end up in the production bundle.
    *   The build will FAIL if "GEMINI_API_KEY" or "AIza" patterns are found in `dist/`.

## 🔑 Authentication
*   **Firebase Authentication**: All AI endpoints (`/api/gemini`) require a valid Firebase ID Token in the `Authorization` header.
*   **Verification**: Tokens are verified server-side using `firebase-admin`.

## 🛡️ API Architecture
*   **Serverless Proxy**: The frontend NEVER calls Google Gemini APIs directly.
*   **Flow**: Frontend -> `/api/gemini` (Vercel Function) -> Gemini API.
*   This ensures the API Key stays on the server.

## 🔄 Rotating Keys
If a leak is suspected:
1.  Revoke the `GEMINI_API_KEY` in Google AI Studio.
2.  Generate a new key.
3.  Update the `GEMINI_API_KEY` environment variable in Vercel settings.
4.  Redeploy.
5.  Check `dist/` locally to confirm the old key is gone (it should not have been there anyway).
