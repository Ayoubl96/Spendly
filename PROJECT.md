# PROJECT.md — Spendly

> **Questo documento è il contesto di progetto.** Va tenuto aggiornato ad ogni milestone.
> Usalo come prompt iniziale quando lavori con un AI assistant sul progetto.
> Ultimo aggiornamento: 2026-02-28

---

## 1. Overview

**Progetto:** Spendly — personal finance app. Riscrittura completa di [Maybe Finance](https://github.com/maybe-finance/maybe) da Ruby on Rails + Hotwire a **Python (FastAPI) + React (TypeScript)**.

**Obiettivo:** Feature parity con l'app Rails esistente, riutilizzando lo **stesso database PostgreSQL** senza migration. L'app Python si connette allo stesso schema, permettendo esecuzione parallela durante la transizione.

**Owner:** Ayoub Lefhim — Product Manager @ Iliad, self-hosted su homelab personale.

**Uso:** Single-user self-hosted personal finance tracker per gestione spese, investimenti (VWCE, 1AMZN, INRG su borse EU), budget mensili. Banche IT: Intesa, Amex, Revolut, Satispay.

**Repository:** `https://git.ayoublefhim.com/ayoubl96/spendly`

---

## 2. Stack Target

| Layer | Tecnologia | Versione | Note |
|-------|-----------|----------|------|
| **API Framework** | FastAPI | 0.115+ | async, Pydantic v2 |
| **ORM** | SQLAlchemy | 2.0+ | mapped_column style |
| **Migration** | Alembic | — | Solo se servono nuove tabelle |
| **Auth** | python-jose + passlib | — | JWT (access+refresh), bcrypt compatibile Rails |
| **Background Jobs** | Celery + Redis | 5.4+ | Worker + Beat per cron |
| **WebSocket** | FastAPI WebSocket | — | Per AI chat streaming + sync status |
| **Frontend** | React + TypeScript | 18+ | Vite bundler |
| **Routing** | TanStack Router | — | Type-safe file-based routing |
| **Data Fetching** | TanStack Query | v5 | Cache, refetch, optimistic updates |
| **State** | Zustand | — | Auth, theme, UI state globale |
| **UI Components** | shadcn/ui | — | Radix primitives + Tailwind |
| **CSS** | Tailwind CSS | 4 | |
| **Charts** | Recharts | — | Time series, donut, sparklines |
| **Database** | PostgreSQL | 16 | Stesso DB dell'app Rails |
| **Cache/Queue** | Redis | 7+ | Celery broker + result backend |
| **Container** | Docker + Compose | — | Multi-service |
| **CI/CD** | Gitea Actions | — | Self-hosted su git.ayoublefhim.com |
| **Registry** | Gitea Container Registry | — | Push interno via IP (10.0.6.27:3000) |

---

## 3. Infrastruttura

### 3.1 Homelab
- **Hypervisor:** Proxmox (LXC containers)
- **Orchestrazione:** Docker Swarm via Portainer
- **Reverse Proxy:** Traefik (HTTPS + Let's Encrypt via Cloudflare)
- **Dominio:** ayoublefhim.com (DNS su Cloudflare)
- **Gitea:** git.ayoublefhim.com
  - Runner: `gitea/act_runner` con Docker socket mount
  - Registry interno: `10.0.6.27:3000` (insecure, bypassa Traefik per push Docker)
  - Runner config usa `--add-host=git.ayoublefhim.com:10.0.6.27` per CI containers
  - Variabili Gitea: `REGISTRY_URL=10.0.6.27:3000`, `AUTHTOKEN` come secret
  - Gitea env: `GITEA__packages__CHUNKED_UPLOAD_PATH=/data/tmp/package-upload`

### 3.2 Deploy Target
Spendly viene deployata come stack Docker Swarm sullo stesso homelab:

```
spendly (Docker Compose / Swarm stack)
├── web         (FastAPI + Uvicorn)
├── worker      (Celery worker)
├── beat        (Celery Beat per scheduled jobs)
├── frontend    (Nginx serving React build)
├── postgres    (riusa istanza esistente o volume condiviso)
└── redis       (riusa istanza esistente o dedicata)
```

### 3.3 Network
- **Dominio app:** spendly.ayoublefhim.com (via Traefik)
- **Traefik labels** su frontend container per HTTPS routing
- Backend API non esposto direttamente — Nginx fa proxy `/api/*` → FastAPI

---

## 4. Database — Schema Esistente

> **REGOLA FONDAMENTALE:** Non modifichiamo lo schema. Mappiamo 1:1 con SQLAlchemy.

### 4.1 Tabelle Principali (35 tabelle)

```
families ──────────────── users
    │                        │
    ├── accounts             ├── sessions
    │     │                  ├── chats → messages → tool_calls
    │     ├── entries        └── api_keys
    │     │     ├── transactions (delegated_type)
    │     │     ├── trades (delegated_type)
    │     │     └── valuations (delegated_type)
    │     ├── holdings
    │     └── balances (materialized daily)
    │
    ├── categories (hierarchical, 2 levels)
    ├── tags ← taggings (polymorphic M2M)
    ├── merchants (STI: FamilyMerchant, ProviderMerchant)
    ├── rules → rule_conditions + rule_actions
    ├── budgets → budget_categories
    ├── imports → import_rows + import_mappings
    ├── plaid_items → plaid_accounts
    └── syncs (polymorphic)

securities (global) → security_prices
exchange_rates (global)
transfers (inflow_tx ↔ outflow_tx)
```

### 4.2 Pattern Critici

| Pattern Rails | Implementazione SQLAlchemy |
|--------------|---------------------------|
| **delegated_type** (Account→Accountable) | Colonna discriminator `accountable_type` + `accountable_id` → relationship generica o property |
| **delegated_type** (Entry→Entryable) | Stessa logica: `entryable_type` + `entryable_id` |
| **STI** (Merchant type, Import type, Message type) | Colonna `type` come discriminator |
| **Generated columns** (Balance) | `Computed()` in SQLAlchemy, read-only |
| **UUID primary keys** | `mapped_column(UUID, default=uuid4)` |
| **JSONB** (locked_attributes, etc.) | `mapped_column(JSONB, default=dict)` |
| **Polymorphic** (Sync, Tagging, Address) | Colonne `*_type` + `*_id` |

### 4.3 Money System
Rails ha un custom `Money` class in `lib/money.rb`:
- `Money.new(amount, currency)` — wraps BigDecimal + Currency
- `exchange_to(currency, date:, fallback_rate:)` — uses ExchangeRate table
- `Monetizable` concern → genera metodi `*_money` sui modelli
- `Arithmetic` module → operazioni tra Money (+, -, *, /)
- `Formatting` module → locale-aware display

**In Python:** Creare equivalente `Money` dataclass con:
- `Decimal` per amount (non float!)
- Conversione via ExchangeRate table
- Helper per formatting per locale

### 4.4 Balance Materialization (IL CUORE)
Il sistema più complesso. Due strategie:

**Forward Calculator** (account manuali):
```
opening_balance → day1 → day2 → ... → today
Per ogni giorno:
  1. Prendi start_cash e start_non_cash dal giorno precedente
  2. Se c'è una Valuation → override totale
  3. Altrimenti: applica entries (txn + trades) al cash balance
  4. Per investment: non_cash = holdings_value (da Holding materialization)
  5. Calcola flows (cash_in, cash_out, non_cash_in, non_cash_out)
  6. Calcola adjustments (differenza non spiegata dai flussi)
  7. Calcola market_value_change (holdings Δ - net buy/sell)
  8. Salva Balance record
```

**Reverse Calculator** (account Plaid-linked):
```
current_balance → today → yesterday → ... → first_entry
(stesso concetto ma all'indietro)
```

**Holding Forward Calculator:**
```
Per ogni security nell'account:
  empty_portfolio → day1 trades → day2 trades → ... → today
  Per ogni giorno:
    1. Applica trades (buy +qty, sell -qty)
    2. Lookup prezzo: priority DB > trade_price > holding_price
    3. Convert currency se necessario (ExchangeRate)
    4. amount = qty × price
  5. Gap-fill con LOCF (Last Observation Carried Forward)
```

**Portfolio Cache:**
- Preload tutte le securities + prezzi per un account
- PriceWithPriority: (price, priority=1|2|3, source="db"|"trade"|"holding")
- Exchange rate conversion per holdings multi-valuta

**Sync Cache:**
- Preload tutte le entries + holdings per un account
- Converte tutto nella valuta dell'account (con fallback_rate=1)

### 4.5 Chart Series Builder
Query SQL complessa per generare time series:
- `generate_series` per date range
- `LATERAL JOIN` per ultimo balance ≤ data
- `LATERAL JOIN` per ultimo exchange_rate ≤ data
- Aggregazione multi-account con currency conversion
- `flows_factor` per invertire liabilities

---

## 5. Funzionalità da Portare

### 5.1 Core (Must Have)
- [x] ~~Analisi codebase~~ (completata)
- [ ] Auth (JWT, bcrypt Rails-compatibile, MFA TOTP)
- [ ] Family + User CRUD
- [ ] Account CRUD (9 accountable types)
- [ ] Entry/Transaction/Trade/Valuation CRUD
- [ ] Transaction search (filtri multipli)
- [ ] Bulk edit/delete transactions
- [ ] Transfer detection + management
- [ ] Category CRUD (hierarchical, 2 levels, colors, icons)
- [ ] Tag CRUD + M2M tagging
- [ ] Merchant CRUD
- [ ] Balance materialization (forward + reverse)
- [ ] Holding materialization (forward + reverse)
- [ ] Portfolio cache + price priority
- [ ] Gap-filling (LOCF)
- [ ] Balance sheet (net worth, asset/liability groups)
- [ ] Income statement (income/expense per period, mediana, media)
- [ ] Budget system (monthly, category allocation, actuals)
- [ ] Market data: Yahoo Finance provider
- [ ] Exchange rate sync
- [ ] Security price sync
- [ ] Account sync engine (state machine: pending→syncing→completed/failed)
- [ ] Scheduled jobs (market data 22:00 UTC, sync cleaner hourly, health check 02:00)
- [ ] Import system (CSV: transaction, trade, account import)
- [ ] Import pipeline (upload → configure → clean → map → confirm → revert)
- [ ] Rules engine (compound conditions, actions: set category/merchant/tag)
- [ ] AI chat (OpenAI function calling, streaming, 4 tools)
- [ ] Balance chart series (time series con period selector)
- [ ] Trend calculations
- [ ] Period system (1D, WTD, 7D, MTD, 30D, 90D, YTD, 365D, 5Y, custom)
- [ ] Data export (family-level)
- [ ] Reconciliation (valuation-based balance correction)
- [ ] Opening balance management
- [ ] Auto-transfer matching
- [ ] Email notifications (password reset, invitations, email confirmation)

### 5.2 Frontend Pages
- [ ] Dashboard (net worth chart, account groups, trends)
- [ ] Account list + detail (activity feed, holdings, balance chart)
- [ ] Transaction list (search, filter, bulk ops, pagination)
- [ ] Transaction detail/edit (inline edit)
- [ ] Investment/Holdings view
- [ ] Trade create/edit
- [ ] Budget page (donut chart, category breakdown, income)
- [ ] Categories management (hierarchy, color picker, icon picker)
- [ ] Tags management
- [ ] Merchants management
- [ ] Rules management (condition builder, preview, apply)
- [ ] Import wizard (5-step)
- [ ] Settings (profile, preferences, security, hosting)
- [ ] AI Chat (sidebar, streaming, function call display)
- [ ] Onboarding flow

### 5.3 Non Portare (Out of Scope)
| Feature | Motivo |
|---------|--------|
| Plaid integration | Non usato (banche IT), complessità enorme |
| Stripe/Subscription billing | Self-hosted single user |
| Impersonation sessions | Feature support team |
| Invite codes | Single user |
| Lookbook design system | Dev tool Rails-specific |
| Mint import | Legacy format |
| Mobile device management | Niente app nativa per ora |
| Demo data generator | Dev tool |
| OAuth Doorkeeper (full) | JWT è sufficiente per self-hosted |
| Synth Finance provider | Rimpiazzato da Yahoo Finance |
| Active Storage (S3) | Usiamo filesystem locale per self-hosted |

---

## 6. Struttura Progetto

```
spendly/
├── .gitea/
│   └── workflows/
│       ├── ci.yml              # Lint + test on push
│       └── build.yml           # Build + push Docker images (solo main)
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app factory
│   │   ├── config.py           # Pydantic Settings
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   ├── dependencies.py     # FastAPI Depends (get_db, get_current_user, etc.)
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # login, register, refresh, mfa
│   │   │   ├── accounts.py
│   │   │   ├── transactions.py
│   │   │   ├── trades.py
│   │   │   ├── valuations.py
│   │   │   ├── categories.py
│   │   │   ├── tags.py
│   │   │   ├── merchants.py
│   │   │   ├── budgets.py
│   │   │   ├── rules.py
│   │   │   ├── imports.py
│   │   │   ├── holdings.py
│   │   │   ├── transfers.py
│   │   │   ├── chats.py
│   │   │   ├── settings.py
│   │   │   ├── securities.py
│   │   │   ├── dashboard.py    # balance sheet, income statement
│   │   │   └── exports.py
│   │   ├── models/             # SQLAlchemy models (1:1 con DB)
│   │   │   ├── __init__.py
│   │   │   ├── base.py         # Base, UUID mixin, Timestamp mixin
│   │   │   ├── family.py
│   │   │   ├── user.py
│   │   │   ├── account.py      # + accountable types
│   │   │   ├── entry.py        # + entryable types (transaction, trade, valuation)
│   │   │   ├── category.py
│   │   │   ├── tag.py
│   │   │   ├── merchant.py
│   │   │   ├── budget.py
│   │   │   ├── rule.py         # + condition, action
│   │   │   ├── transfer.py
│   │   │   ├── security.py     # + security_price
│   │   │   ├── holding.py
│   │   │   ├── balance.py
│   │   │   ├── exchange_rate.py
│   │   │   ├── import_.py      # "import" è keyword Python → import_
│   │   │   ├── chat.py         # + message, tool_call
│   │   │   ├── sync.py
│   │   │   └── session.py
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── account.py
│   │   │   ├── transaction.py
│   │   │   ├── ... (uno per dominio)
│   │   │   └── common.py       # Money, Trend, Period, Series schemas
│   │   ├── services/           # Business logic (non nei models!)
│   │   │   ├── __init__.py
│   │   │   ├── money.py                  # Money class + Currency + Arithmetic
│   │   │   ├── balance_calculator.py      # Forward + Reverse
│   │   │   ├── balance_materializer.py
│   │   │   ├── holding_calculator.py      # Forward + Reverse
│   │   │   ├── holding_materializer.py
│   │   │   ├── portfolio_cache.py
│   │   │   ├── sync_cache.py
│   │   │   ├── chart_series_builder.py
│   │   │   ├── balance_sheet.py
│   │   │   ├── income_statement.py
│   │   │   ├── budget_engine.py
│   │   │   ├── transfer_matcher.py
│   │   │   ├── rule_engine.py
│   │   │   ├── import_pipeline.py
│   │   │   ├── account_syncer.py
│   │   │   ├── opening_balance.py
│   │   │   ├── reconciliation.py
│   │   │   └── entry_search.py
│   │   ├── providers/
│   │   │   ├── __init__.py
│   │   │   ├── yahoo_finance.py
│   │   │   ├── openai_chat.py
│   │   │   └── registry.py
│   │   └── tasks/              # Celery tasks
│   │       ├── __init__.py
│   │       ├── celery_app.py
│   │       ├── sync_tasks.py
│   │       ├── market_data_tasks.py
│   │       ├── import_tasks.py
│   │       ├── rule_tasks.py
│   │       └── export_tasks.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_balance_calculator.py     # CRITICI
│   │   ├── test_holding_calculator.py     # CRITICI
│   │   └── validation/
│   │       └── test_rails_parity.py       # Confronto output Python vs Rails
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   ├── client.ts        # Axios/fetch wrapper con JWT
│   │   │   ├── hooks/           # TanStack Query hooks per dominio
│   │   │   └── types.ts         # TypeScript types
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── charts/          # Recharts wrappers
│   │   │   ├── layout/          # Sidebar, Header, Shell
│   │   │   └── shared/          # MoneyDisplay, CategoryBadge, etc.
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── accounts/
│   │   │   ├── transactions/
│   │   │   ├── investments/
│   │   │   ├── budgets/
│   │   │   ├── categories/
│   │   │   ├── rules/
│   │   │   ├── imports/
│   │   │   ├── chat/
│   │   │   └── settings/
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   └── uiStore.ts
│   │   └── lib/
│   │       ├── money.ts         # Format money per locale
│   │       ├── periods.ts       # Period definitions
│   │       └── utils.ts
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── Dockerfile
│   └── nginx.conf
├── compose.yml                   # Development
├── compose.prod.yml              # Production (Swarm-compatible)
├── PROJECT.md                    # ← QUESTO FILE
├── CHANGELOG.md                  # Changelog (Keep a Changelog format)
├── VERSION                       # Current version (single line: 0.1.0)
├── .env.example
└── README.md
```

---

## 7. Versioning & Branching Strategy

### 7.1 Semantic Versioning
Spendly usa [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH

0.x.x  → Pre-release (fino a feature parity)
1.0.0  → Feature parity con Maybe Rails
1.x.0  → Nuove features post-parity
x.x.1  → Bug fix
```

**Mapping versioni → milestone:**

| Versione | Milestone | Descrizione |
|----------|-----------|-------------|
| `0.1.0` | Fase 0-1 | Scaffolding + SQLAlchemy models completi |
| `0.2.0` | Fase 2-3 | Auth + Account management |
| `0.3.0` | Fase 4 | Entries, transactions, trades |
| `0.4.0` | Fase 5 | Balance & Holdings engine ⚠️ |
| `0.5.0` | Fase 6-7 | Market data, sync, analytics |
| `0.6.0` | Fase 8-9 | Rules, import system |
| `0.7.0` | Fase 10 | AI chat |
| `0.8.0` | Fase 11-13 | React: shell + dashboard + transactions |
| `0.9.0` | Fase 14-16 | React: investments + budget + import + settings |
| `0.10.0` | Fase 17 | Export & misc |
| `1.0.0` | Fase 18 | Production ready, feature parity ✅ |

### 7.2 Branch Strategy (Git Flow semplificato)

```
main                          ← sempre deployable, tagged releases
  │
  ├── develop                 ← integration branch, CI green
  │     │
  │     ├── feat/phase-0-scaffolding
  │     ├── feat/phase-1-models
  │     ├── feat/phase-2-auth
  │     ├── feat/phase-5-balance-engine
  │     ├── feat/add-sparkline-endpoint
  │     │
  │     ├── fix/balance-rounding-error
  │     ├── fix/jwt-refresh-expiry
  │     │
  │     └── chore/update-dependencies
  │
  └── hotfix/critical-balance-bug   ← solo emergenze, da main
```

**Regole:**
- `main` riceve merge solo da `develop` (via PR) o da `hotfix/*`
- `develop` riceve merge da `feat/*`, `fix/*`, `chore/*`
- Ogni merge in `main` = nuovo tag di versione
- Feature branches: `feat/{phase-N}-{descrizione}` o `feat/{descrizione}`
- Bug fix: `fix/{descrizione}`
- Chore: `chore/{descrizione}`
- Hotfix (emergenze): `hotfix/{descrizione}` → merge in `main` + `develop`

### 7.3 Workflow per ogni fase

```bash
# 1. Crea feature branch da develop
git checkout develop
git pull
git checkout -b feat/phase-1-models

# 2. Lavora, committa
git add .
git commit -m "feat(models): add Family, User, Account SQLAlchemy models"
git commit -m "feat(models): add 9 accountable types"
git commit -m "feat(models): add Entry + entryable types"
git commit -m "test(models): add CRUD validation tests"

# 3. Merge in develop (via PR su Gitea o direct merge)
git checkout develop
git merge --no-ff feat/phase-1-models
git push

# 4. Quando develop è stabile per una release:
git checkout main
git merge --no-ff develop
git tag -a v0.1.0 -m "v0.1.0 - Scaffolding + SQLAlchemy models"
git push --follow-tags

# 5. Torna su develop per la fase successiva
git checkout develop
```

### 7.4 Commit Convention
[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

Tipi:
  feat     → Nuova funzionalità
  fix      → Bug fix
  refactor → Refactoring senza cambio funzionale
  test     → Aggiunta/modifica test
  docs     → Documentazione
  chore    → Dipendenze, config, CI
  perf     → Ottimizzazione performance

Scope (opzionale):
  models, auth, accounts, transactions, balance, holdings,
  sync, market-data, analytics, rules, import, chat,
  ui, dashboard, settings, ci, docker
```

**Esempi:**
```
feat(models): add Balance model with Computed columns
feat(balance): implement ForwardCalculator
fix(holdings): correct gap-fill for weekends
test(balance): add Rails parity validation
refactor(auth): extract JWT logic to dependency
chore(ci): add backend lint job to pipeline
docs: update PROJECT.md with phase 2 progress
perf(chart): optimize LATERAL JOIN query for balance series
```

### 7.5 Tag Convention
```
v{MAJOR}.{MINOR}.{PATCH}

Esempi:
  v0.1.0          → primo tag, scaffolding completo
  v0.4.0          → balance engine funzionante
  v0.4.1          → fix bug nel balance engine
  v1.0.0          → feature parity, production ready
  v1.0.0-rc.1     → release candidate (opzionale)
```

---

## 8. Changelog

Mantenuto in `CHANGELOG.md` nel formato [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

Tutte le modifiche rilevanti del progetto sono documentate in questo file.
Formato basato su [Keep a Changelog](https://keepachangelog.com/).
Versionamento: [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- (features in sviluppo su develop)

## [0.1.0] - YYYY-MM-DD
### Added
- Scaffolding monorepo (backend FastAPI + frontend React)
- Docker Compose dev environment
- SQLAlchemy models per tutte le 35 tabelle
- CI pipeline su Gitea Actions
```

Il changelog viene aggiornato ad ogni merge in `main` prima di creare il tag.

---

## 9. CI/CD — Gitea Actions

### 9.1 Repository
- **URL:** `https://git.ayoublefhim.com/ayoubl96/spendly`
- **Runner:** Docker-based, labels: `ubuntu-latest`
- **Registry:** `10.0.6.27:3000` (Gitea Container Registry, insecure)
- **Secrets:** `AUTHTOKEN` (Gitea access token per registry push)
- **Variables:** `REGISTRY_URL=10.0.6.27:3000`

### 9.2 Pipeline: CI (ogni push su qualsiasi branch)

```yaml
# .gitea/workflows/ci.yml
name: CI
on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main, develop]

jobs:
  lint-backend:
    runs-on: ubuntu-latest
    container:
      image: python:3.12-slim
    steps:
      - uses: actions/checkout@v4
      - name: Install deps
        run: |
          cd backend
          pip install -r requirements.txt
          pip install ruff mypy
      - name: Lint
        run: |
          cd backend
          ruff check .
          ruff format --check .
      - name: Type check
        run: |
          cd backend
          mypy app/ --ignore-missing-imports

  test-backend:
    runs-on: ubuntu-latest
    container:
      image: python:3.12-slim
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: spendly_test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: spendly_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - name: Install deps
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx
      - name: Run tests
        env:
          DATABASE_URL: postgresql://spendly_test:test@postgres:5432/spendly_test
          REDIS_URL: redis://redis:6379/0
          SECRET_KEY: test-secret-key
        run: |
          cd backend
          pytest tests/ -v

  lint-frontend:
    runs-on: ubuntu-latest
    container:
      image: node:22-slim
    steps:
      - uses: actions/checkout@v4
      - name: Install deps
        run: |
          cd frontend
          npm ci
      - name: Lint + type check
        run: |
          cd frontend
          npm run lint
          npm run typecheck
```

### 9.3 Pipeline: Build & Push (solo merge su main)

```yaml
# .gitea/workflows/build.yml
name: Build & Push
on:
  push:
    branches: [main]
    tags: ["v*"]

jobs:
  build-backend:
    runs-on: ubuntu-latest
    container:
      image: catthehacker/ubuntu:act-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login Registry
        run: |
          echo "${{ secrets.AUTHTOKEN }}" | docker login ${{ vars.REGISTRY_URL }} -u ${{ github.repository_owner }} --password-stdin
      - name: Build & Push
        run: |
          IMAGE="${{ vars.REGISTRY_URL }}/${{ github.repository }}/backend"
          docker build -t ${IMAGE}:latest -t ${IMAGE}:${{ github.sha }} backend/
          docker push ${IMAGE}:latest
          docker push ${IMAGE}:${{ github.sha }}

  build-frontend:
    runs-on: ubuntu-latest
    container:
      image: catthehacker/ubuntu:act-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login Registry
        run: |
          echo "${{ secrets.AUTHTOKEN }}" | docker login ${{ vars.REGISTRY_URL }} -u ${{ github.repository_owner }} --password-stdin
      - name: Build & Push
        run: |
          IMAGE="${{ vars.REGISTRY_URL }}/${{ github.repository }}/frontend"
          docker build -t ${IMAGE}:latest -t ${IMAGE}:${{ github.sha }} frontend/
          docker push ${IMAGE}:latest
          docker push ${IMAGE}:${{ github.sha }}
```

### 9.4 Deploy
Per ora deploy manuale via Portainer:
```bash
docker service update --image 10.0.6.27:3000/ayoubl96/spendly/backend:latest spendly_web
docker service update --image 10.0.6.27:3000/ayoubl96/spendly/frontend:latest spendly_frontend
```

Futuro: Gitea webhook → Portainer webhook → auto-redeploy.

---

## 10. Task Tracking

### Fase 0: Project Setup ⬜
- [ ] 0.1 — Scaffolding monorepo (struttura cartelle, pyproject.toml, package.json)
- [ ] 0.2 — Docker Compose dev (postgres, redis, backend, worker, beat, frontend)
- [ ] 0.3 — Config (Pydantic Settings, CORS, logging)
- [ ] 0.4 — Gitea repo + CI pipeline setup + branch develop
- [ ] 0.5 — Docker Compose prod (Swarm-compatible, Traefik labels)

### Fase 1: SQLAlchemy Models ⬜
- [ ] 1.1 — Base, UUID mixin, Timestamp mixin
- [ ] 1.2 — Core: Family, User, Account, Entry
- [ ] 1.3 — Accountable types (9): Depository, Investment, Crypto, CreditCard, Loan, Property, Vehicle, OtherAsset, OtherLiability
- [ ] 1.4 — Entryable types (3): Transaction, Trade, Valuation
- [ ] 1.5 — Financial: Category, Tag, Tagging, Merchant, Budget, BudgetCategory
- [ ] 1.6 — Market data: Security, SecurityPrice, Holding, Balance, ExchangeRate
- [ ] 1.7 — Transfer, RejectedTransfer, Rule, RuleCondition, RuleAction
- [ ] 1.8 — Import, ImportRow, ImportMapping
- [ ] 1.9 — Chat, Message (STI), ToolCall
- [ ] 1.10 — Sync, Setting, Session, ApiKey
- [ ] 1.11 — Validation script (confronto tabelle DB vs modelli)

### Fase 2: Auth ⬜
- [ ] 2.1 — Auth endpoints (register, login, refresh token)
- [ ] 2.2 — JWT middleware + dependencies (get_current_user, get_current_family)
- [ ] 2.3 — MFA TOTP (pyotp, compatibile con setup Rails)
- [ ] 2.4 — Password reset flow + email sending
- [ ] 2.5 — User settings CRUD

### Fase 3: Account Management ⬜
- [ ] 3.1 — Account CRUD (create with accountable, read, update, delete)
- [ ] 3.2 — Opening balance + current balance management (OpeningBalanceManager, CurrentBalanceManager)
- [ ] 3.3 — Reconciliation (ReconciliationManager, dry_run support)
- [ ] 3.4 — Account type-specific endpoints (9 types)
- [ ] 3.5 — Account state machine (active/disabled/pending_deletion)
- [ ] 3.6 — Sparkline data endpoint

### Fase 4: Entries & Transactions ⬜
- [ ] 4.1 — Entry base (create/read/update/delete with entryable)
- [ ] 4.2 — Transaction CRUD + category/merchant/tag assignment
- [ ] 4.3 — Transaction search (EntrySearch port)
- [ ] 4.4 — Bulk update/delete
- [ ] 4.5 — Trade CRUD + security resolver
- [ ] 4.6 — Valuation CRUD + confirmation flow (kinds: reconciliation, current_anchor)
- [ ] 4.7 — Transfer management (auto-match ±4 days, FX tolerance, confirm, reject, create)

### Fase 5: Balance & Holdings Engine ⬜ ⚠️ CRITICO
- [ ] 5.1 — Money class (Decimal, Currency, exchange_to, Arithmetic, Formatting)
- [ ] 5.2 — Sync Cache (preload entries + holdings, currency conversion)
- [ ] 5.3 — Balance BaseCalculator (flows_for_date, cash/non-cash split, market_value_change, adjustments)
- [ ] 5.4 — Balance ForwardCalculator
- [ ] 5.5 — Balance ReverseCalculator
- [ ] 5.6 — Balance Materializer (calculate → persist → purge → update account)
- [ ] 5.7 — Portfolio Cache (PriceWithPriority, price priority: DB>trade>holding, FX conversion)
- [ ] 5.8 — Holding ForwardCalculator
- [ ] 5.9 — Holding ReverseCalculator + PortfolioSnapshot
- [ ] 5.10 — Holding Materializer + Gapfill (LOCF)
- [ ] 5.11 — **Validation test: Python output == Rails output su stesso DB**

### Fase 6: Market Data & Sync ⬜
- [ ] 6.1 — Yahoo Finance provider (port da ruby)
- [ ] 6.2 — Security price importer (batch upsert, gap-fill)
- [ ] 6.3 — Exchange rate importer
- [ ] 6.4 — Market data importer (global: full + snapshot mode)
- [ ] 6.5 — Account market data importer (per-account FX pairs + security prices)
- [ ] 6.6 — Security resolver (exact_db → exact_provider → close_provider → offline)
- [ ] 6.7 — Security health checker
- [ ] 6.8 — Sync engine (state machine, parent-child, window expansion, dedup)
- [ ] 6.9 — Celery tasks + beat schedule (market data 22:00, sync cleaner hourly, health check 02:00)

### Fase 7: Analytics ⬜
- [ ] 7.1 — Balance sheet (net worth, classification groups, account groups, totals)
- [ ] 7.2 — Chart series builder (SQL: generate_series + LATERAL JOIN + FX conversion)
- [ ] 7.3 — Income statement (totals, category stats, family stats, median/avg per interval)
- [ ] 7.4 — Budget engine (find_or_bootstrap, sync categories, actuals, allocations, donut data)
- [ ] 7.5 — Trend + Period + Series utilities

### Fase 8: Categories, Tags, Merchants, Rules ⬜
- [ ] 8.1 — Categories CRUD (hierarchical, bootstrap defaults, replace & destroy)
- [ ] 8.2 — Tags CRUD
- [ ] 8.3 — Merchants CRUD (FamilyMerchant)
- [ ] 8.4 — Rules engine (compound conditions AND/OR, actions, locked_attributes check, apply, affected count)

### Fase 9: Import System ⬜
- [ ] 9.1 — Import base (CSV parsing, number format, signage convention, pipeline state)
- [ ] 9.2 — TransactionImport
- [ ] 9.3 — TradeImport
- [ ] 9.4 — AccountImport
- [ ] 9.5 — Import mappings (category, tag, account)
- [ ] 9.6 — Import rows + validation + revert

### Fase 10: AI Chat ⬜
- [ ] 10.1 — Chat CRUD + WebSocket streaming
- [ ] 10.2 — OpenAI assistant (function calling, streaming)
- [ ] 10.3 — Function tools (get_accounts, get_balance_sheet, get_income_statement, get_transactions)

### Fase 11: React Shell ⬜
- [ ] 11.1 — Project setup (Vite, TanStack Router/Query, shadcn/ui, Tailwind)
- [ ] 11.2 — Auth pages (login, register, password reset, MFA)
- [ ] 11.3 — Layout shell (sidebar, header, theme switcher, responsive)
- [ ] 11.4 — API client layer (typed hooks con TanStack Query)

### Fase 12: Dashboard & Balance Sheet ⬜
- [ ] 12.1 — Dashboard page (net worth card, chart, account groups)
- [ ] 12.2 — Account list + detail (activity, holdings, chart)
- [ ] 12.3 — Net worth chart (Recharts + period selector)
- [ ] 12.4 — Balance sheet view

### Fase 13: Transactions UI ⬜
- [ ] 13.1 — Transaction list (filterable table, pagination)
- [ ] 13.2 — Transaction detail/edit (inline edit)
- [ ] 13.3 — Transaction create
- [ ] 13.4 — Category dropdown (hierarchical + search)
- [ ] 13.5 — Transfer management UI
- [ ] 13.6 — Bulk edit modal

### Fase 14: Investments UI ⬜
- [ ] 14.1 — Holdings list (cards, portfolio weight)
- [ ] 14.2 — Holding detail (trade history, price chart)
- [ ] 14.3 — Trade create/edit
- [ ] 14.4 — Investment account view

### Fase 15: Budget, Categories, Rules UI ⬜
- [ ] 15.1 — Budget page (donut, categories, income)
- [ ] 15.2 — Categories management
- [ ] 15.3 — Rules management (condition builder, preview)
- [ ] 15.4 — Tags + Merchants management

### Fase 16: Import, Settings, Chat UI ⬜
- [ ] 16.1 — Import wizard (5-step)
- [ ] 16.2 — Settings pages (profile, preferences, security, hosting)
- [ ] 16.3 — AI Chat UI (sidebar, streaming, function calls)
- [ ] 16.4 — Onboarding flow

### Fase 17: Export & Misc ⬜
- [ ] 17.1 — Family data export
- [ ] 17.2 — Currency management
- [ ] 17.3 — File uploads (profile image)

### Fase 18: Testing & Production ⬜
- [ ] 18.1 — Backend unit + integration tests
- [ ] 18.2 — Balance/Holdings validation tests (Python vs Rails parity)
- [ ] 18.3 — Frontend component + E2E tests (Playwright)
- [ ] 18.4 — Docker production build (multi-stage)
- [ ] 18.5 — Swarm stack deploy config (compose.prod.yml)
- [ ] 18.6 — Migration guide (cutover plan)

---

## 11. Milestone Go/No-Go

| # | Milestone | Criterio | Fasi | Versione |
|---|-----------|----------|------|----------|
| M1 | **Can I log in?** | Auth funzionante, stesse credenziali Rails | 0-2 | v0.2.0 |
| M2 | **Is my data correct?** | Balance + Holdings == output Rails | 5 | v0.4.0 |
| M3 | **Can I use it daily?** | Transactions + Dashboard end-to-end | 11-13 | v0.8.0 |
| M4 | **Feature parity** | Tutte le feature portate | 17 | v0.10.0 |
| M5 | **Production ready** | Test + Docker prod + deploy | 18 | v1.0.0 |

---

## 12. Convenzioni

### 12.1 Backend
- **Python 3.12+**
- **Async everywhere**: FastAPI + async SQLAlchemy dove possibile
- **Naming**: snake_case per tutto, PascalCase per classi
- **Linting**: `ruff` (check + format)
- **Type checking**: `mypy`
- **Testing**: `pytest` + `pytest-asyncio` + `httpx` (test client)
- **Imports**: absolute (`from app.models.account import Account`)
- **No business logic nei models**: i model sono solo mapping DB, la logica va in `services/`

### 12.2 Frontend
- **TypeScript strict mode**
- **Linting**: ESLint + Prettier
- **Component pattern**: features/ per pagine, components/ per riutilizzabili
- **Naming**: PascalCase per componenti, camelCase per functions/hooks
- **CSS**: utility-first Tailwind, zero CSS custom files
- **API hooks**: `use{Resource}` pattern (useAccounts, useTransactions)

### 12.3 Commit Convention
[Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <description>

Tipi: feat, fix, refactor, test, docs, chore, perf
Scope: models, auth, accounts, transactions, balance, holdings,
       sync, market-data, analytics, rules, import, chat,
       ui, dashboard, settings, ci, docker
```

---

## 13. Note di Compatibilità Rails ↔ Python

| Aspetto | Rails | Python | Compatibile? |
|---------|-------|--------|-------------|
| Password hash | bcrypt via has_secure_password | passlib.hash.bcrypt | ✅ Sì |
| MFA TOTP | rotp gem | pyotp | ✅ Stesso RFC 6238 |
| Decimal precision | precision: 19, scale: 4 | Decimal + quantize | ✅ |
| Timestamps | UTC (ActiveRecord) | datetime.now(UTC) | ✅ |
| UUIDs | gen_random_uuid() | uuid.uuid4() | ✅ |
| Generated columns | virtual stored | Computed(), read-only | ✅ Non scrivere mai |

---

## 14. Riferimenti

- **Codebase Rails originale:** `/Users/ayoublefhim/Code/maybe/`
- **Schema DB:** `/Users/ayoublefhim/Code/maybe/db/schema.rb`
- **Balance calculators:** `/Users/ayoublefhim/Code/maybe/app/models/balance/`
- **Holding calculators:** `/Users/ayoublefhim/Code/maybe/app/models/holding/`
- **Money library:** `/Users/ayoublefhim/Code/maybe/lib/money.rb`
- **Schedule config:** `/Users/ayoublefhim/Code/maybe/config/schedule.yml`
- **Analisi completa:** Vedi transcript conversazione 2026-02-28

---

*Questo documento viene aggiornato ad ogni milestone completata. Quando lavori sul progetto, forniscilo come contesto iniziale.*
