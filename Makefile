# Override on the command line: make ssh HOST=root@1.2.3.4
# Set HETZNER_HOST / HETZNER_USER in your shell profile (same names as the
# GitHub Actions secrets) or pass them on the command line:
#   export HETZNER_HOST=1.2.3.4   HETZNER_USER=root
#   make ssh HETZNER_HOST=1.2.3.4 HETZNER_USER=root
HETZNER_USER ?= root
HOST ?= $(HETZNER_USER)@$(HETZNER_HOST)

.PHONY: ssh db-tunnel

ssh:
	ssh $(HOST)

# Forwards the production Postgres to localhost:5432.
# Connect with: psql postgresql://gamgee:PASSWORD@localhost:5433/gamgee
db-tunnel:
	@echo "DB tunnel open at localhost:5433  (Ctrl-C to stop)"
	ssh -L 5433:localhost:5432 -N $(HOST)
