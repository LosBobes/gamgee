# Configuring transactional email (SendGrid + Cloudflare Tunnel + Hetzner)

This document walks through wiring Gamgee's outbound email — verification
links, password-reset links, and admin-initiated reset notices — to **Twilio
SendGrid**, with DNS managed in **Cloudflare** and the app itself running
behind a **Cloudflare Tunnel** on a **Hetzner** server.

It covers:

1. Why email matters and what Gamgee sends.
2. Provisioning a SendGrid account and verifying your domain (DKIM + SPF +
   DMARC) using Cloudflare DNS.
3. Pointing your apex/subdomain at the Hetzner box via a Cloudflare Tunnel.
4. Wiring the secrets into the Gamgee stack (`.env`, `docker-compose.prod.yml`).
5. Smoke-testing the whole pipe and troubleshooting the common failures.

> **Heads-up on terms:** "Twilio SendGrid" is just SendGrid; Twilio is the
> parent company. "Hashflare tunnel" doesn't exist — the tunnel product is
> **Cloudflare Tunnel** (aka `cloudflared`). This guide uses Cloudflare
> throughout.

---

## 1. What Gamgee sends

Three transactional templates, all rendered server-side in
`backend/app/email_service.py`:

| Trigger                                        | Endpoint                                          | TTL of link |
|------------------------------------------------|---------------------------------------------------|-------------|
| User registers                                 | `POST /api/auth/register`                         | 48 h        |
| User asks for resend (signed-in)               | `POST /api/auth/resend-verification-me`           | 48 h        |
| User asks for resend (signed-out, by email)    | `POST /api/auth/resend-verification`              | 48 h        |
| User clicks "Forgot password"                  | `POST /api/auth/forgot-password`                  | 60 min      |
| Admin issues a reset link                      | `POST /api/admin/users/{id}/reset-password`       | 60 min      |
| Admin sets a temp password and notifies user   | same endpoint with `new_password` supplied        | n/a (notice)|

Tokens are 32 random bytes (URL-safe base64) and **only the SHA-256 hash is
stored in Postgres** — a DB leak alone can't be used to take over accounts.
The raw token lives in exactly two places: the user's inbox and the URL the
backend signed.

If `SENDGRID_API_KEY` and `EMAIL_FROM` are unset, the backend falls back to
logging the rendered email body to stdout. That makes local development and
CI work without any third-party network calls; in production, set both.

---

## 2. SendGrid setup

### 2.1 Create the account & API key

1. Sign up at <https://signup.sendgrid.com> (the free tier is 100 emails/day,
   plenty for this scale).
2. In the SendGrid dashboard, go to **Settings → API Keys → Create API Key**.
3. Name it `gamgee-prod` (or similar). Permissions: **Restricted Access** →
   give the key only **Mail Send → Full Access**. Save the key value — you
   only see it once. Treat it like a password.

### 2.2 Verify your sending domain

You can't send mail from a domain you haven't proven you own. SendGrid uses
**DKIM** for that, and you'll also want **SPF** and **DMARC** to keep your
messages out of the spam folder.

1. In SendGrid: **Settings → Sender Authentication → Authenticate Your Domain**.
2. Pick **Cloudflare** as your DNS host (it doesn't change the records — it
   just shows you what to copy).
3. Enter your domain, e.g. `gamgee.example.com` (or just `example.com` if
   that's where the app lives). Choose **automated security** — SendGrid will
   manage DKIM key rotation for you.
4. SendGrid spits out three CNAME records, something like:

   ```
   em1234.example.com.   CNAME  u12345678.wl.sendgrid.net
   s1._domainkey.example.com.  CNAME  s1.domainkey.u12345678.wl.sendgrid.net
   s2._domainkey.example.com.  CNAME  s2.domainkey.u12345678.wl.sendgrid.net
   ```

### 2.3 Add the records in Cloudflare

1. In Cloudflare → your domain → **DNS → Records → Add record**.
2. For each CNAME above:
   - **Type:** CNAME
   - **Name:** the left-hand value (Cloudflare auto-trims your apex)
   - **Target:** the SendGrid target
   - **Proxy status:** **DNS only** (grey cloud). Authentication CNAMEs must
     resolve directly — proxying through Cloudflare hides the real target and
     breaks DKIM lookups.
3. Add an SPF record if you don't already have one:

   ```
   Type:   TXT
   Name:   @
   Value:  v=spf1 include:sendgrid.net ~all
   ```

   If you already publish SPF for another sender (Google Workspace etc.),
   merge them — you may only have **one** SPF TXT per domain. Example:
   `v=spf1 include:_spf.google.com include:sendgrid.net ~all`.
4. (Strongly recommended) Add a DMARC record:

   ```
   Type:   TXT
   Name:   _dmarc
   Value:  v=DMARC1; p=none; rua=mailto:dmarc@example.com; fo=1
   ```

   Start with `p=none` so you can monitor reports without breaking delivery,
   then ratchet up to `p=quarantine` and eventually `p=reject` once you see
   that legitimate mail is passing.

5. Back in SendGrid, click **Verify**. Propagation through Cloudflare is
   usually under a minute; if it fails, double-check that each CNAME is
   **DNS only**, not proxied.

### 2.4 Verify a single-sender (only if you skipped 2.2)

If you can't get DNS access — for instance, you're testing against
`@gmail.com` — use **Settings → Sender Authentication → Single Sender
Verification** to verify just one address. It works for development but
mail will get poor deliverability and is rate-limited; production should
always be domain-authenticated.

### 2.5 Pick the sender address

Choose an address on the authenticated domain that doesn't accept replies,
e.g. `no-reply@gamgee.example.com`. You can leave the mailbox completely
unconfigured (SendGrid sends *from* it; it doesn't need to *receive*) — but
DMARC reports want a real mailbox, so if you set `rua=mailto:...`, make sure
*that* address works.

---

## 3. Exposing Hetzner via Cloudflare Tunnel

A Cloudflare Tunnel (`cloudflared`) connects your Hetzner VPS to Cloudflare's
edge from the inside out. The server never needs a public TCP port open —
which is exactly what you want when your only inbound surface is HTTPS and
SSH.

```
Browser → Cloudflare edge → encrypted tunnel → cloudflared on Hetzner
                                                    │
                                                    ▼
                                              localhost:3000  (nginx in Docker)
```

### 3.1 Install cloudflared on Hetzner

```bash
# As root on the Hetzner box:
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

cloudflared tunnel login        # opens a URL — paste it in your browser
                                # and authorize the zone (your domain)
cloudflared tunnel create gamgee
```

Note the tunnel UUID it prints — you'll need it.

### 3.2 Route DNS

```bash
cloudflared tunnel route dns gamgee gamgee.example.com
```

That creates a **proxied** CNAME `gamgee.example.com →
<UUID>.cfargotunnel.com` in Cloudflare DNS. (Unlike the SendGrid CNAMEs,
this one **should** be proxied — that's the whole point of the tunnel.)

### 3.3 Configure the tunnel

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: <UUID>
credentials-file: /root/.cloudflared/<UUID>.json

ingress:
  - hostname: gamgee.example.com
    service: http://localhost:3000
  - service: http_status:404
```

Then run it as a service:

```bash
cloudflared service install
systemctl enable --now cloudflared
systemctl status cloudflared       # should show active (running)
```

### 3.4 Lock down the host firewall

Since traffic now arrives via the tunnel, you can close port 80/443 on the
public internet entirely. Keep SSH (22) open or move it behind Cloudflare
Access:

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw enable
```

The Docker stack continues to bind `127.0.0.1:3000:80` (see
`docker-compose.prod.yml`) — that's reachable only from the host, which is
exactly what `cloudflared` needs.

---

## 4. Wiring secrets into Gamgee

### 4.1 Where the secrets live

The production stack reads four SendGrid-related env vars at container
startup:

- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `APP_BASE_URL`

`APP_BASE_URL` is **critical** — the backend uses it to build the links it
puts inside emails. If it points at `localhost` in production, your users
will click reset links that go nowhere. The domain you set here must match
the one served by the Cloudflare Tunnel.

The same value is also automatically allowed as a CORS origin (see
`backend/app/main.py`); set `CORS_EXTRA_ORIGINS=` to a comma-separated list
if you need additional origins.

We use **two layers** of configuration so neither dev secrets nor org
secrets end up in the wrong place:

| Layer | Source of truth | Used for |
|---|---|---|
| `/opt/gamgee/.env` on the Hetzner box | Hand-edited on the server | `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`, `JWT_SECRET` — values that should never leave the host |
| GitHub **organization secrets** | UI: `Settings → Secrets and variables → Actions → New organization secret` | `SENDGRID_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `APP_BASE_URL` — values the deploy workflow rotates without an SSH session |

`.github/workflows/deploy.yml` forwards the four GitHub secrets through to
the remote shell via the `appleboy/ssh-action` `envs:` parameter, then
exports them before running `docker compose up`. Shell env beats compose's
auto-loaded `.env` for variable substitution, so the secrets land in the
backend container without ever being written to disk on the box.

If any of the four GitHub secrets is unset, the workflow unsets the
matching shell var on the box, so compose falls back to whatever the box
`.env` has (or empty, which puts the backend in log-only email mode).

### 4.2 First-time setup

On the Hetzner box, create `/opt/gamgee/.env` with the values that should
**not** live in GitHub:

```ini
POSTGRES_USER=gamgee
POSTGRES_PASSWORD=<long-random-string>
POSTGRES_DB=gamgee
JWT_SECRET=<64-hex-chars; openssl rand -hex 32>
```

Then add these to your GitHub organization secrets:

```
SENDGRID_API_KEY  = SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM        = no-reply@gamgee.example.com
EMAIL_FROM_NAME   = Gamgee
APP_BASE_URL      = https://gamgee.example.com
```

Trigger a deploy (push to `main` or **Actions → Deploy to Hetzner → Run
workflow**). To rotate the API key later, update only the GitHub secret
and re-run the workflow — no SSH needed.

### 4.2 Bring up the stack

```bash
cd /opt/gamgee
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml logs -f backend  # watch for "Application startup complete."
```

If the API key or sender address is wrong, the first email send will print
an error like `SendGrid rejected message (401): ...` in the backend logs —
the request to the API still succeeds (so the user gets a 202), the
message just doesn't go out. Fix and restart `backend` only:

```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## 5. Smoke-testing the pipe

From your laptop:

```bash
# 1. Register a user with a real inbox you control.
curl -X POST https://gamgee.example.com/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "username":"smoketest",
    "password":"Str0ng-Test-Pass!",
    "name":"Smoke Test",
    "email":"you+gamgee@example.com",
    "gender":"prefer_not_to_say"
  }'
```

Within ~30 s you should receive a "Verify your Gamgee account" email. Click
the link — you'll land on `https://gamgee.example.com/verify-email?token=...`,
which the frontend hands to `POST /api/auth/verify-email`. On success the
banner inside the app stops showing for that account.

Then try the reset flow:

```bash
curl -X POST https://gamgee.example.com/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"you+gamgee@example.com"}'
```

You'll receive "Reset your Gamgee password" with a 60-minute link.

Finally, sign in as an admin user, open `/admin`, hit **Reset PW** on a
test row, and try both modes (send-link and set-temp-password). The modal
will show you the generated link even when you also email it — handy if a
user's mailbox is dead.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend logs `[email-dev] to=…` instead of sending | `SENDGRID_API_KEY` or `EMAIL_FROM` is empty | Set both in `.env`, restart backend |
| `SendGrid rejected message (401)` | API key wrong, revoked, or wrong scope | Re-issue with **Mail Send** permission |
| `403` from SendGrid | Sender domain/identity not verified | Re-run SendGrid's **Sender Authentication** flow; check DKIM CNAMEs are **DNS-only** in Cloudflare |
| Emails arrive but go to spam | SPF/DMARC missing or `~all`/`-all` mis-merged with another sender | Merge SPF into one record, set DMARC `p=none` initially |
| Reset link 404s in the browser | Tunnel hostname mismatches `APP_BASE_URL`, or Vite/nginx isn't catching `/reset-password` | Confirm `APP_BASE_URL` matches the proxied hostname and that the frontend's `nginx.conf` falls through to `index.html` for unknown paths |
| Link works locally but not in production | `APP_BASE_URL` still set to `http://localhost:5173` | Update `.env`, `docker compose restart backend` |
| `connection refused` from cloudflared | Backend stack down, or it's binding `0.0.0.0` instead of `127.0.0.1:3000` | `docker compose ps`, ensure the frontend service publishes `127.0.0.1:3000:80` |
| Verification email never arrives at all | Cloudflare DNS proxied SendGrid CNAMEs (orange cloud) | Set those CNAMEs to **DNS only**; wait ~1 min, re-verify in SendGrid |
| 422 on `/api/auth/reset-password` | New password doesn't pass the policy (12+ chars, mixed case, digit, symbol, not in blocklist) | Pick a stronger password; the frontend's strength meter shows what's missing |

---

## 7. Rotating the API key

1. In SendGrid → API Keys → **Create API Key** with the same `Mail Send` scope.
2. In GitHub → org **Settings → Secrets and variables → Actions** → update
   `SENDGRID_API_KEY` to the new value.
3. **Actions → Deploy to Hetzner → Run workflow** (or push to `main`). The
   workflow forwards the new secret into the compose call and the backend
   container picks it up automatically.
4. Verify by sending one of the test emails above.
5. **Then** delete the old key in SendGrid.

Doing the order above means there's no window where the backend has no
valid key — important if you're rotating because the old one leaked, not
on a fixed cadence. The old container only stops once the new one passes
its health check, so a bad rotation can be rolled back with `git revert`
of the deploy commit + a fresh workflow run.

---

## 8. Where the code lives

- `backend/app/email_service.py` — SendGrid HTTP call + templates.
- `backend/app/tokens.py` — token generation/hashing.
- `backend/app/routers/auth.py` — `/forgot-password`, `/reset-password`,
  `/verify-email`, `/resend-verification`, `/resend-verification-me`.
- `backend/app/routers/admin.py` — `/admin/users/{id}/reset-password` and the
  `is_verified` toggle on `PATCH /admin/users/{id}`.
- `backend/app/models.py` — `User.is_verified`, `PasswordResetToken`,
  `EmailVerificationToken`.
- `frontend/src/components/AuthScreen.tsx` — forgot/reset/verify views.
- `frontend/src/App.tsx` — deep-links `/reset-password?token=...` and
  `/verify-email?token=...` straight into the auth screen.
- `frontend/src/admin/AdminApp.tsx` — admin reset-password modal.

Tests for the new flows live in `backend/tests/test_password_reset.py`.
