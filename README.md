# Passkeys IdP — Security-by-Design (Next.js + WebAuthn + PKCE)

A **standalone authentication server** you can deploy on **GitHub Codespaces** or **Vercel** (free tiers). It acts like an SSO/IdP so your main app stays clean. Design goals: **phishing-resistance**, **minimal PII**, **Jobs-level minimal UI**, and **boringly secure defaults**.

## What’s inside

- ✅ **Passkeys (WebAuthn)** via `@simplewebauthn` (register & sign-in)
- ✅ **OAuth-like Code + PKCE (S256)** for app integration
- ✅ **RS256 JWT** + **JWKS** for consumers to verify tokens
- ✅ **Upstash Redis** for minimal state (users, credentials, challenges, auth codes, refresh)
- ✅ **Security headers, CSP, Permissions-Policy**
- ✅ **Rate limiting** on sensitive endpoints (Upstash Ratelimit)
- ✅ **CSRF/state/PKCE** on OAuth flow, **replay protection** on challenges
- ✅ **Audit events** (privacy-conscious, capped)
- ✅ **Minimal, accessible UI** (clear CTAs, keyboard-first)
- 🆕 **Passkey metadata** (`credentialDeviceType`, `credentialBackedUp`)
- 🆕 **Credential management UI/APIs** (list, rename, delete with guardrails)
- 🆕 **Refresh tokens** (rotating, reuse-detection)
- 🆕 **/health** & **/metrics** endpoints for ops
- 🆕 **Multi-redirect allowlist** for OAuth clients

---

## Threat model (concise) & mitigations

| Threat | Mitigation |
| --- | --- |
| Credential theft during registration | HTTPS only; strict RP ID + origin; tight CSP; `X-Frame-Options: DENY`. |
| Challenge replay | One-time challenges with TTL + delete on consume. |
| Brute force/enumeration | Sliding window rate limits; unified error messages. |
| CSRF/state fixation | `state` + PKCE (S256); HttpOnly `__Host-` cookies; SameSite=Lax. |
| Token forgery | RS256 JWT; apps verify via JWKS. |
| Open redirect | **Exact-match allowlist** (`OAUTH_REDIRECT_URIS`). |
| Session fixation | New session after reg/auth; `__Host-session` cookie. |
| Clickjacking | XFO: DENY; `frame-ancestors 'none'`. |
| XSS | Tight CSP; no HTML injection; minimal inline allowances for Next runtime. |
| Refresh token theft | HttpOnly **rotating** refresh cookie + reuse-detection & immediate invalidation. |
| Abuse/DDoS | Rate limits on WebAuthn & OAuth routes; cheap Redis checks. |
| PII over-collection | Store only email label + public keys + counters + metadata; no phone/SMS. |

---

## File tree (key parts)

passkeys-idp/
app/
login/page.tsx
app/page.tsx
api/
webauthn/
register/{options,verify}/route.ts
auth/{options,verify}/route.ts
credentials/{route.ts, [id]/{route.ts}} # NEW: list/rename/delete
session/route.ts
logout/route.ts
oauth/
authorize/route.ts
token/route.ts
refresh/route.ts # NEW: refresh (rotating)
jwks/route.ts
health/route.ts # NEW
metrics/route.ts # NEW
lib/
db.ts
jwt.ts
webauthn.ts
rl.ts
audit.ts
types.ts
middleware.ts
next.config.js
package.json
tsconfig.json
.env.local.example
README.md

yaml
Copy code

---

## Data model (what’s stored)

**User**
```ts
type User = {
  userId: string;     // stable UUID
  email: string;      // label only
  credentials: Credential[];
  createdAt: number;
};
Credential

ts
Copy code
type Credential = {
  credId: string;                 // base64url credential ID
  publicKey: string;              // base64url DER
  counter: number;                // signCount
  transports?: AuthenticatorTransport[];
  credentialDeviceType?: "singleDevice" | "multiDevice";   // NEW
  credentialBackedUp?: boolean;                             // NEW
  friendlyName?: string;                                    // NEW (UI)
  createdAt?: number;                                       // NEW
  lastUsedAt?: number;                                      // NEW
};
Auth code (PKCE-bound) and Refresh token record (rotating)

ts
Copy code
type AuthCode = {
  sub: string;
  code_challenge: string;
  code_challenge_method: "S256";
  client_id: string;
  redirect_uri: string;
};
type RefreshRecord = {
  sub: string;
  rot: string;      // current rotation id
  exp: number;      // epoch seconds
};
API surface
WebAuthn (register/auth)
POST /api/webauthn/register/options → PublicKeyCredentialCreationOptions (rate-limited)

POST /api/webauthn/register/verify → sets __Host-session

POST /api/webauthn/auth/options → PublicKeyCredentialRequestOptions (rate-limited)

POST /api/webauthn/auth/verify → sets __Host-session

Notes

On registration verify, store registrationInfo.credentialDeviceType and registrationInfo.credentialBackedUp.
Correct usage:

ts
Copy code
const { registrationInfo } = await verifyRegistrationResponse(...);
const { credentialDeviceType, credentialBackedUp } = registrationInfo;
Session / logout
GET /api/session → { user: email|null }

POST /api/logout → clears __Host-session

OAuth (Code + PKCE + Refresh)
GET /api/oauth/authorize?... → redirects with code (requires __Host-session)

POST /api/oauth/token → { access_token, token_type, expires_in, scope }

POST /api/oauth/refresh → { access_token, ... } (requires __Host-refresh cookie; rotates token)

JWKS
GET /api/jwks → { keys: [...] }

Credentials (NEW)
GET /api/credentials → [ { credId, friendlyName, credentialDeviceType, credentialBackedUp, lastUsedAt } ]

PATCH /api/credentials/:id → rename (requires recent auth)

DELETE /api/credentials/:id → delete (guard: cannot delete last credential)

Ops (NEW)
GET /api/health → { ok:true, redis:true, kid:"...", uptime:123 }

GET /api/metrics → Prometheus text; requires Authorization: Bearer $METRICS_BEARER

Environment variables
Copy .env.local.example → .env.local and set:

env
Copy code
# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# WebAuthn Relying Party
RP_NAME=Passkeys IdP

# RS256 keys (paste PEMs exactly)
JWT_PRIVATE_KEY_PEM="""-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----"""
JWT_PUBLIC_KEY_PEM="""-----BEGIN PUBLIC KEY----- ... -----END PUBLIC KEY-----"""

# OAuth client(s)
OAUTH_CLIENT_ID=demo
OAUTH_CLIENT_SECRET=secret
# Exact-match allowlist (CSV). authorize() rejects anything else.
OAUTH_REDIRECT_URIS=http://localhost:3001/callback,https://your-app.vercel.app/callback

# Token lifetimes
ACCESS_TOKEN_TTL_SEC=3600
REFRESH_TOKEN_TTL_SEC=1209600    # 14 days

# Metrics
METRICS_BEARER=change-me-long-random
Run locally (Codespaces)
bash
Copy code
npm i
cp .env.local.example .env.local   # fill the values
# Generate RS256 keys once:
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# Paste into env as PEM blocks
npm run dev
# open HTTPS URL → /login
Deploy (Vercel)
Import repo, set env vars.

Deploy. WebAuthn requires the deployed HTTPS origin as RP origin.

Add your app’s redirect(s) to OAUTH_REDIRECT_URIS.

Integrate a client app (OAuth-like, PKCE)
Step 1: redirect to authorize

bash
Copy code
GET /api/oauth/authorize
  ?client_id=demo
  &redirect_uri=https://your-app/callback
  &state=xyz
  &code_challenge=...
  &code_challenge_method=S256
Step 2: exchange code for token

bash
Copy code
curl -X POST https://idp.example.com/api/oauth/token \
  -H 'content-type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code' \
  -d "client_id=demo" \
  -d "client_secret=secret" \
  -d "redirect_uri=https://your-app/callback" \
  -d "code=RECEIVED_CODE" \
  -d "code_verifier=YOUR_PLAIN_VERIFIER"
Step 3: verify JWT via JWKS at /api/jwks.

Refresh (optional)

On first token exchange, IdP sets __Host-refresh (HttpOnly) and returns access_token.

When Access Token nears expiry, call:

bash
Copy code
curl -X POST https://idp.example.com/api/oauth/refresh \
  --cookie "__Host-refresh=..." 
Server rotates refresh (reuse-detection); returns new access_token.

Credential management (NEW)
Minimal UI in /login or a new /account screen:

List registered passkeys with:

Friendly name (editable)

Device type (single/multi)

Backed up (boolean)

Last used

Rename (PATCH /api/credentials/:id)

Remove (DELETE /api/credentials/:id)

Guard: require recent authentication (e.g., signed within last 5 min) via session timestamp.

Guard: cannot remove the last passkey.

Server-side:

Rate-limit all three routes.

Audit cred_list, cred_rename, cred_delete.

Update lastUsedAt on successful authentication.

Security headers (middleware)
Content-Security-Policy: strict defaults; allow only self + Upstash connect; minimal 'unsafe-inline' for Next runtime.

X-Frame-Options: DENY, frame-ancestors 'none'

Permissions-Policy: publickey-credentials-get=(self) plus all others disabled

HSTS with preload

SameSite=Lax on __Host-session & __Host-refresh

Keep RP ID = hostname; changing domains will invalidate passkeys.

Auditing
Logged (capped to last 500 per type):

reg_options, reg_verify, auth_options, auth_verify

oauth_authorize, oauth_token, oauth_refresh_{issued,denied}

cred_list, cred_rename, cred_delete

metrics_read (without leaking bearer)

Payloads exclude secrets and full tokens; store timestamps and coarse IP only.

Health & Metrics
GET /api/health: { ok, redis, kid, uptime }

GET /api/metrics: Prometheus text (counters for route hits, rate-limit blocks, verify failures, refresh reuse detections). Require Authorization: Bearer $METRICS_BEARER.

Operational notes
Rate limits: Independent buckets for register/auth, OAuth, credentials, metrics.

Unified errors: avoid existence oracles.

Redis TTLs: challenges (10 min), auth codes (5 min), refresh records (configurable).

Key rotation: When you rotate RS256 keys, keep previous kid in JWKS until all consumer caches expire.

Roadmap (optional)
Org-gated registration (e.g., email domain allowlist or GitHub org)

Tenant theming (brand, colors, logo) without layout changes

Device attestation policy toggle (none/platform/aaguid allowlist)

yaml
Copy code

---

If you want, I can turn any of the NEW endpoints/fields above into exact patches and curl tests, but I kept the repo untouched per your “don’t do anything” instruction.