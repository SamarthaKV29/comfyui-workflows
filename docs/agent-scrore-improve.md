Improve how ready https://fastkodelabs.com is for agents.

Current Is Agentic score: 65/100 (Is Agentic readiness model based on Ora audit evidence).

Implement the following fixes in priority order (failures first, then warnings):

1. Agent-friendly 404s (Essential, Failed)
Evidence: Nonexistent paths return HTTP 200 with the app shell (soft-404). Agents probing for resources conclude every path exists. Return a real HTTP 404 status for unknown paths.
Recommended fix: Return a real HTTP 404 (or 410) status for nonexistent paths - never a 200 with your app shell, which makes agents believe every path exists. For full credit, give the 404 response a short markdown body pointing agents at your sitemap, llms.txt, or docs index. Verify with `curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/some-path-that-does-not-exist` - it must print 404.
Current result: Failed.

2. Content behind auth (Essential, Partial)
Evidence: Some sampled pages are auth-gated: 1 looks like a login wall (https://fastkodelabs.com/fk-admin/)
Recommended fix: Serve your content pages without a login wall. Agents cannot complete auth flows while browsing - a 401/403 or a login-form page is invisible content. Keep public documentation public; if some content must stay gated, publish an ungated summary so agents can still represent it.
Current result: Partial (50%).

3. Markdown content negotiation (acceptmarkdown.com) (Essential, Failed)
Evidence: Not acceptmarkdown.com compliant: Accept: text/markdown returned text/html; charset=utf-8; Vary header missing Accept (got "accept-encoding, origin")
Recommended fix: On the responses that serve text/markdown via Accept negotiation, add Accept to the Vary header (Vary: Accept, Accept-Encoding). Without it, CDNs can serve the cached HTML variant to an agent asking for markdown (or vice versa), depending on which variant landed in cache first.
Current result: Failed.

4. Developer portal (Recommended, Failed)
Evidence: No developer portal found
Recommended fix: Create a developer portal at /developers with API keys, documentation, quickstart guides, and a sandbox environment.
Current result: Failed.

5. CLI tool available (Recommended, Failed)
Evidence: No CLI tool found
Recommended fix: Publish an official CLI tool on npm, PyPI, or Homebrew. A CLI lets agents and developers script interactions with your product without building API integrations from scratch.
Current result: Failed.

6. Agent instruction / when-to-use (Recommended, Failed)
Evidence: No agent instruction file with when-to-use guidance found
Recommended fix: Tell agents when to reach for you: add a 'when to use this' section to your llms.txt (or a dedicated agent-instructions file) that names your best-fit use cases and how an agent should call you. Be specific about the jobs you are right for - generic marketing copy does not read as guidance.
Current result: Failed.

7. Organization schema completeness (Recommended, Partial)
Evidence: Organization schema found but missing: contactPoint
Recommended fix: Add Organization JSON-LD that includes both contactPoint (with email/phone and contactType) and address (PostalAddress). This lets AI verify your business legitimacy and answer contact queries.
Current result: Partial (50%).

8. Trust anchor pages (Recommended, Partial)
Evidence: About, Contact pages verified - missing: Privacy
Recommended fix: Publish real /about, /contact, and /privacy pages with at least 500 characters of content each. These are the pages AI agents check to verify your business is legitimate before recommending you.
Current result: Partial (50%).

Requirements:
- Inspect the existing codebase before changing files.
- Follow each published protocol or file format exactly.
- Preserve existing product behavior and visual design.
- Add or update tests for every behavior you change.
- Verify every public endpoint and machine-readable file after implementation.
- Finish with a concise change summary, verification results, and any remaining recommendations that require product decisions or credentials.