# Deploying Gamgee to Hetzner

**Version: 0.1.0**

This document walks through deploying Gamgee on a Hetzner VPS. It also explains *why* each component exists so you understand the moving parts, not just the commands.

---

## Architecture overview

```
Browser
  │  HTTPS (443)
  ▼
Caddy                          ← reverse proxy, handles TLS
  │  HTTP (localhost:3000)
  ▼
nginx container                ← serves the compiled React app
  │  GET /api/* → HTTP (backend:8000, internal)
  │  GET /*     → static files from dist/
  ▼
FastAPI container              ← REST API (Python)
  │  SQL (db:5432, internal)
  ▼
PostgreSQL container           ← database
```

**Why this layering?**

- **Caddy** faces the internet. It terminates TLS (handles Let's Encrypt certificates automatically) and forwards plain HTTP to nginx. Running TLS directly inside Docker is more complex, so Caddy handles it on the host.
- **nginx** is not exposed to the internet — only to Caddy on `localhost:3000`. It serves the pre-built React static files (HTML/JS/CSS) and proxies any request starting with `/api/` to the FastAPI container. This means the browser only ever talks to one origin.
- **FastAPI** and **PostgreSQL** are on Docker's internal network only. There is no port published to the host for them — you can't reach them from the internet at all, only from other containers in the same Compose project.

---

## Components explained

### Docker Compose
Compose starts all three services (nginx, backend, db) as containers on a shared private network called `gamgee_net`. Containers on this network reach each other by service name (`backend`, `db`) — those names resolve inside Docker's DNS. The only thing exposed to the host is port `3000` on `127.0.0.1` (loopback only, not `0.0.0.0`), so Caddy can reach nginx but nothing else can.

### nginx (frontend container)
The React app is compiled at build time (`pnpm run build` → `dist/`) and baked into the nginx Docker image. nginx serves those static files. Its `nginx.conf` contains one proxy rule: requests to `/api/` are forwarded to `http://backend:8000`. This is how the browser's API calls reach FastAPI without knowing the backend's address.

### FastAPI (backend container)
A Python REST API. It connects to PostgreSQL on startup and runs database migrations automatically. JWT tokens (HS256, 7-day expiry) are used for auth — the secret comes from the `JWT_SECRET` environment variable. In production the container runs without `--reload`, so code is not hot-reloaded.

### PostgreSQL (db container)
Standard Postgres 16. Data is stored in a named Docker volume (`pgdata`) so it survives container restarts and re-deploys. The volume is NOT deleted when you run `docker compose down` — you need `docker compose down -v` to destroy it.

### Caddy
Caddy runs on the host (not in Docker). It listens on ports 80 and 443. When a browser hits your domain on port 443, Caddy presents a TLS certificate it obtained automatically from Let's Encrypt. It then proxies the request to nginx at `localhost:3000` over plain HTTP. Caddy renews certificates before they expire — you don't manage certificates manually.

---

## Prerequisites

- A domain name (see step 1)
- A Hetzner account

---

## 1. Get a domain

**Cloudflare Registrar** is recommended — at-cost pricing, no markup, and the DNS dashboard you'll use for step 3. Go to cloudflare.com → Domain Registration → Register. Expect ~$10–15/year for a `.com`.

Alternatives: Porkbun, Namecheap.

---

## 2. Create the Hetzner server

1. Go to [hetzner.com/cloud](https://hetzner.com/cloud) → New Project → Add Server
2. **Image**: Ubuntu 24.04
3. **Type**: CX22 (2 vCPU, 4 GB RAM, 40 GB SSD) — ~€4/month
4. **Region**: closest to your users
5. Add your SSH public key during creation (`~/.ssh/id_rsa.pub`)
6. Note the server's public IP once it's running

---

## 3. Point DNS to the server

In your DNS dashboard, create two A records:

| Name  | Type | Value            |
|-------|------|------------------|
| `@`   | A    | `YOUR_SERVER_IP` |
| `www` | A    | `YOUR_SERVER_IP` |

Cloudflare propagates within minutes; other registrars may take up to 48 h.

---

## 4. Set up the server

SSH in:
```bash
ssh root@YOUR_SERVER_IP
```

Install Docker (the official install script sets up the apt repo and installs the latest stable release):
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
```

Install Caddy from the official apt repo (the package on Ubuntu's default repo is outdated):
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

Configure the firewall. UFW (Uncomplicated Firewall) is the Ubuntu frontend for iptables. You need SSH so you don't lock yourself out, port 80 for Let's Encrypt's HTTP challenge, and port 443 for HTTPS:
```bash
ufw allow ssh && ufw allow 80 && ufw allow 443 && ufw enable
```

---

## 5. Clone the repo and configure

```bash
git clone https://github.com/YOUR_USER/gamgee /opt/gamgee
cd /opt/gamgee
cp .env.example .env
nano .env
```

Set production values in `.env`:

```env
POSTGRES_USER=gamgee
POSTGRES_PASSWORD=some_strong_password
POSTGRES_DB=gamgee
JWT_SECRET=generate_a_long_random_string_here
```

Generate a secure JWT secret — `openssl rand` produces cryptographically random bytes; `-hex 32` gives 64 hex characters (256 bits of entropy):
```bash
openssl rand -hex 32
```

---

## 6. Configure Caddy

```bash
cp /opt/gamgee/Caddyfile /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile   # replace yourdomain.com with your actual domain
```

The Caddyfile is a single directive:

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

Caddy reads this, sees a hostname with no explicit TLS config, and automatically obtains a Let's Encrypt certificate for it. The `reverse_proxy` directive forwards all traffic to nginx at `localhost:3000`.

---

## 7. Build and start

```bash
cd /opt/gamgee
docker compose -f docker-compose.prod.yml up -d --build
systemctl reload caddy
```

- `--build` rebuilds the Docker images from source (required on first deploy and after any code change).
- `-d` runs containers in the background (detached).
- `systemctl reload caddy` applies the new Caddyfile without downtime.

The site will be live at `https://yourdomain.com`. Caddy provisions the TLS certificate on the first request (within a few seconds).

---

## Updating after code changes

```bash
cd /opt/gamgee
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Docker rebuilds only the layers that changed (thanks to layer caching), so subsequent deploys are fast. The database is untouched — the named volume (`pgdata`) persists across rebuilds.

---

## Password reset

### Self-service (user knows current password)

`POST /api/auth/change-password` — authenticated, no admin required:

```bash
curl -X POST https://yourdomain.com/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "old", "new_password": "new-min-8-chars"}'
```

Returns `204 No Content` on success. Fails with `400` if the current password is wrong or the new one is under 8 characters.

### Admin reset (user locked out)

There is no email-based reset flow. Reset directly in the database:

```bash
# 1. Shell into the running DB container
docker exec -it gamgee-db-1 psql -U gamgee -d gamgee

# 2. Generate a bcrypt hash for the new password (run on the server — passlib is installed with the backend)
docker exec gamgee-backend-1 python3 -c \
  "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('newpassword'))"

# 3. Update the user in psql (paste the hash from step 2)
UPDATE users
SET hashed_password = '$2b$12$...'
WHERE username = 'the_username';
```

---

## How the production compose differs from dev

| | `docker-compose.yml` (dev) | `docker-compose.prod.yml` |
|---|---|---|
| Frontend | Vite dev server, source volume-mounted | nginx serving production build, code baked into image |
| Backend | `--reload` enabled, source volume-mounted | no `--reload`, code baked into image |
| Ports | 5173, 8000, 5432 all published to host | only `127.0.0.1:3000` published |
| JWT_SECRET | default placeholder | required from `.env`, app refuses to start without it |

The dev compose exposes all ports so you can hit the API directly in a browser or tool like Postman. In production, only nginx is reachable from the host, and only via loopback (so only Caddy, which runs on the same machine, can reach it).

---

## Logs and debugging

```bash
# Tail all container logs
docker compose -f docker-compose.prod.yml logs -f

# Tail one service
docker compose -f docker-compose.prod.yml logs -f backend

# Check Caddy logs
journalctl -u caddy -f

# Connect directly to the database
docker exec -it gamgee-db-1 psql -U gamgee -d gamgee
```

---

## Admin panel

The app ships with a built-in backoffice at `/admin`. It covers four entity tables — Users, Exercises, Workout Sessions, and Personal Records — with inline editing and deletion.

### Granting admin access

There is no self-registration for admins. Promote a user directly in the database:

```bash
# Shell into the running DB container
docker exec -it gamgee-db-1 psql -U gamgee -d gamgee

# Promote by username
UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
```

Once the user's token is refreshed (next login, or immediately if already logged in and the `/api/auth/me` response is re-fetched), a **Shield / Admin** button appears in the app header linking to `/admin`.

### How it works

- **Auth**: the admin panel reuses the same JWT token stored in `localStorage`. Navigating to `/admin` verifies the token against `GET /api/admin/users`; a 403 means the account isn't an admin.
- **Protection**: every `/api/admin/*` route requires `is_admin = true` on the authenticated user. A non-admin token gets a `403 Admin access required` response.
- **User deletion**: deleting a user via the admin panel cascades — their workouts, PRs, and health metrics are removed first, then the user row.
- **Self-protection**: the panel blocks removing your own admin rights and deleting your own account.

### Admin API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/{id}` | Update name / email / gender / is_admin |
| DELETE | `/api/admin/users/{id}` | Delete user and all their data |
| GET | `/api/admin/workouts` | List all workout sessions (all users) |
| DELETE | `/api/admin/workouts/{id}` | Delete a session |
| GET | `/api/admin/prs` | List all personal records (all users) |
| DELETE | `/api/admin/prs/{id}` | Delete a PR |
| GET | `/api/admin/exercises` | List exercise catalogue |
| POST | `/api/admin/exercises` | Create an exercise |
| PATCH | `/api/admin/exercises/{id}` | Update an exercise |
| DELETE | `/api/admin/exercises/{id}` | Delete an exercise |

---

## Server access and DB tunnel

A `Makefile` in the repo root provides shorthand commands. The default host is set at the top of the file; override it on the command line with `HOST=`.

```bash
# SSH into the server
make ssh

# SSH with a different host
make ssh HOST=root@1.2.3.4
```

### Forwarding the database locally

The production Postgres is bound to `127.0.0.1:5432` on the server (loopback only — not reachable from the internet). An SSH tunnel bridges it to your local machine:

```bash
make db-tunnel
```

The Makefile reads `HETZNER_HOST` and `HETZNER_USER` from your environment — the same variable names used as GitHub Actions secrets, so you only need to set them once:

```bash
# Add to ~/.zshrc or ~/.bashrc
export HETZNER_HOST=1.2.3.4
export HETZNER_USER=root
```

While the tunnel is open, connect from your local machine as if Postgres were local:

```bash
psql postgresql://gamgee:PASSWORD@localhost:5432/gamgee

# or with any GUI (TablePlus, DBeaver, etc.)
# host: localhost  port: 5432  user: gamgee  db: gamgee
```

The password is whatever `POSTGRES_PASSWORD` is set to in the server's `.env`. Press `Ctrl-C` to close the tunnel.

### GitHub Actions secrets

The deploy workflow (`.github/workflows/deploy.yml`) requires these repository secrets:

| Secret | Value |
|--------|-------|
| `HETZNER_HOST` | Server IP or hostname |
| `HETZNER_USER` | SSH user (usually `root`) |
| `HETZNER_SSH_KEY` | Private key whose public half is on the server |
| `HETZNER_PORT` | SSH port (optional, defaults to 22) |
| `DEPLOY_PATH` | Absolute path on server, e.g. `/opt/gamgee` |

Set these under **GitHub → repo → Settings → Secrets and variables → Actions**.
