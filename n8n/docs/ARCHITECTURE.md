# n8n Architecture & Workflow Organization

This repository serves as the centralized, source-controlled hub for **n8n workflows**, **automation templates**, and **operational documentation** at Fast-Kode.

---

## Directory Taxonomy

All automations are partitioned by functional business domain under `n8n/workflows/`:

```text
n8n/
├── docs/                                      # Infrastructure, credentials, and deployment guides
│   ├── ARCHITECTURE.md                        # High-level architecture and conventions (this file)
│   └── linkedin-daily-writer-setup.md         # Dedicated setup guide for LinkedIn Bot
└── workflows/
    ├── content-social/                        # Content creation, scheduling, social distribution
    │   └── linkedin-daily-writer/             # Telegram + AI Agent + LinkedIn publisher
    ├── lead-gen/                              # Outbound scraping, enrichment, qualification
    ├── operations/                            # Infrastructure monitors, alerts, backups
    └── crm-marketing/                         # Email sequencing, customer lifecycle flows
```

---

## Design Principles

### 1. Template-First Architecture
Workflows stored in this repository are designed as **organization templates**:
- Any team member or client account on the n8n instance can clone or import a workflow from the template catalog.
- **Shared defaults**: Core LLM providers (e.g., OpenRouter with `google/gemma-4-31b-it:free`) and shared utilities are configured at the workflow level so cloners do not need to configure API keys for base intelligence.
- **Isolated tenant parameters**: Each workflow contains a top-level `Edit Fields (User Config)` node that isolates user-specific settings (e.g., Telegram Chat ID, Persona Voice, LinkedIn URN).

### 2. Decoupled State & Resiliency
- Avoid long-running `Wait` nodes that span hours or days; instance restarts or webhook timeouts will terminate pending executions.
- Multi-step conversational flows use decoupled triggers:
  - **Prompters**: Scheduled cron jobs that push a prompt to the user.
  - **Listeners**: Webhook/Update triggers that ingest responses and carry state via message metadata or callback payloads.

### 3. Progressive Autonomy (HITL to Auto-Pilot)
Automations dealing with public-facing communication (e.g. LinkedIn, Twitter, Email) must support **Human-in-the-Loop (HITL)** validation by default:
- An explicit toggle (`ENABLE_HITL: true | false`) allows users to review drafts via Telegram inline action buttons (`[Publish]`, `[Regenerate]`).
- Once output quality meets steady-state standards, switching `ENABLE_HITL` to `false` transitions the pipeline to full zero-touch publishing.

---

## Versioning & Synchronization
- Every production workflow is exported to this directory as JSON when changes are finalized.
- Workflow JSON files are sanitized before committing to ensure private credentials and tokens are replaced by credential references or placeholder values.
