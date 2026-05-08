# Deploying to Hetzner

Production stack: Docker Compose (frontend nginx + FastAPI + PostgreSQL) behind Caddy as a TLS-terminating reverse proxy.

```
Browser → Caddy (443, TLS) → frontend nginx (127.0.0.1:3000)
                                  ├── /api/* → backend:8000 (Docker-internal)
                                  └── /*     → built React files
                                                    backend:8000 → db:5432
```

PostgreSQL and the backend are not reachable from the internet — only within Docker's internal network.

---

## 1. Get a domain

**Cloudflare Registrar** is recommended — at-cost pricing, no markup, and the DNS dashboard you'll use most. Create an account at cloudflare.com, then go to **Domain Registration → Register**. Expect ~$10–15/year for a `.com`.

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

Install Docker:
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
```

Install Caddy:
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

Configure the firewall:
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

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

---

## 6. Configure Caddy

```bash
cp /opt/gamgee/Caddyfile /etc/caddy/Caddyfile
nano /etc/caddy/Caddyfile   # replace yourdomain.com with your actual domain
```

The Caddyfile is a single directive — Caddy automatically obtains and renews a Let's Encrypt TLS certificate:

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## 7. Build and start

```bash
cd /opt/gamgee
docker compose -f docker-compose.prod.yml up -d --build
systemctl reload caddy
```

The site will be live at `https://yourdomain.com`. Caddy provisions the TLS certificate on the first request.

---

## Updating after code changes

```bash
cd /opt/gamgee
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## How the production compose differs from dev

| | `docker-compose.yml` (dev) | `docker-compose.prod.yml` |
|---|---|---|
| Frontend | Vite dev server, volume-mounted | nginx serving production build |
| Backend | `--reload`, volume-mounted | no `--reload`, code baked into image |
| Ports | 5173, 8000, 5432 all public | only `127.0.0.1:3000` exposed |
| JWT_SECRET | default placeholder | required from `.env` |
