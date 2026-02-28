# Spendly

Personal finance app — self-hosted, open source.

Riscrittura di [Maybe Finance](https://github.com/maybe-finance/maybe) in **Python (FastAPI) + React (TypeScript)**.

## Stack

| Backend | Frontend |
|---------|----------|
| FastAPI + Pydantic v2 | React 18 + TypeScript |
| SQLAlchemy 2.0 | TanStack Router + Query |
| Celery + Redis | shadcn/ui + Tailwind CSS 4 |
| PostgreSQL 16 | Recharts |

## Quick Start

```bash
# Development
docker compose up

# Production (Docker Swarm)
docker stack deploy -c compose.prod.yml spendly
```

## Documentation

- [PROJECT.md](PROJECT.md) — contesto completo del progetto, architettura, task tracking
- [CHANGELOG.md](CHANGELOG.md) — changelog delle versioni

## Versioning

[Semantic Versioning](https://semver.org/) — versione corrente in `VERSION`.

## License

Private — Ayoub Lefhim
