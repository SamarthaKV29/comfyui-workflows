# LinkedIn Daily Writer Workflow Suite

This directory contains the production-grade, modular LinkedIn Daily Post Writer automation suite.

---

## Workflows

### 1. `01_morning_prompter.json`
- **Schedule**: Every weekday at 09:00 AM (customizable via cron `0 9 * * 1-5`).
- **Function**: Sends a proactive message to the user's Telegram chat inviting today's topic, outline, or research links.
- **Node Setup**: Only requires configuring `chat_id` and selecting your Telegram Bot API credential.

### 2. `02_research_publish_agent.json`
- **Trigger**: Telegram webhook listening for text updates and inline button callback clicks.
- **AI Intelligence**: **OpenRouter** default using `google/gemma-4-31b-it:free` (no per-user AI account setup needed).
- **Optional HITL Gate**: Controlled via `enable_hitl` (`true` / `false`):
  - When `true`: Sends preview card to Telegram with `[🚀 Publish to LinkedIn]` and `[🔄 Regenerate]` buttons.
  - When `false`: Publishes immediately upon generation to the specified author URN.
- **LinkedIn Publishing**: Posts to LinkedIn REST API (`/rest/posts`) using OAuth2 authentication.

---

## Supporting Files

- `persona.config.json`: Ready-to-use persona and writing style system prompts (Founder Thought Leadership, Technical Educator, Corporate Brand).
- `../../docs/linkedin-daily-writer-setup.md`: Step-by-step setup guide for BotFather, LinkedIn App credentials, and deployment.

---

## How to Duplicate for a New User / Client
1. In n8n, import `01_morning_prompter.json` and `02_research_publish_agent.json` into the target user's project space.
2. In `02_research_publish_agent.json`, open the `User_Config` node and enter:
   - `authorized_chat_id` (Telegram User ID)
   - `enable_hitl` (`true` or `false`)
   - `persona_system_prompt` (Selected persona style)
   - `linkedin_author_urn` (`urn:li:person:...` or `urn:li:organization:...`)
3. Connect the user's specific Telegram Bot and LinkedIn OAuth2 credentials.
4. Toggle both workflows to **Active**.
