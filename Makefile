# Override on the command line: make ssh HOST=root@1.2.3.4
HOST ?= root@YOUR_SERVER_IP

.PHONY: ssh db-tunnel

ssh:
	ssh $(HOST)

# Forwards the production Postgres to localhost:5432.
# Connect with: psql postgresql://gamgee:PASSWORD@localhost:5432/gamgee
db-tunnel:
	@echo "DB tunnel open → localhost:5432  (Ctrl-C to stop)"
	ssh -L 5432:localhost:5432 -N $(HOST)
