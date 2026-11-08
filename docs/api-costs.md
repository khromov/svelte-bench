# Experimental API cost tracking

The September 8–November 8, 2026 audit covers 36 API runs (3,157 samples). All
lack saved token usage, response IDs and billed cost. The machine-readable audit
is `benchmarks/api-cost-report.json`. Its null totals mean **unknown**, not free.
Saved, cleaned component source cannot recover reasoning, caching, retries or
exact provider tokenization. Current rates cannot establish historical rates.
No historical result files or scores were changed.

## Future runs

The OpenAI, Anthropic, Google, OpenRouter, Fireworks, Meta, xAI, Reflection,
Tinker, Z.ai, Moonshot and MiniMax adapters capture response usage and IDs.
Sequential and parallel results save an `apiUsage` array on each sample and
preserve it across checkpoints/resumption. An asynchronous context associates
requests with their sample, including provider retries; there is no shared
"last response" field on providers. Ollama is excluded. Cursor's agent SDK is
not instrumented and its costs remain unavailable.

Requests are also appended immediately to `benchmarks/api-usage/*.jsonl`, before
cleaning and testing. These ledgers retain returned responses rejected by code
validation, including attempts that never become benchmark samples. Back them
up along with checkpoints. They contain usage and IDs, not prompts, outputs or
credentials. The report of result files covers saved samples only; these
ledgers are required to inspect interrupted runs and discarded samples.
Validation probes outside benchmark samples and failed HTTP requests without a
usage response are excluded. Provider SDK retries without returned usage cannot
be reconstructed. This is not an account invoice.

OpenRouter's `usage.cost` is preferred, including a genuine zero charge. Other
providers' undocumented cost fields are not interpreted as USD. For BYOK,
OpenRouter's account charge may exclude upstream billing; raw usage details are
retained. Token counts remain available even without a supported price.

## Commands

```sh
# Defaults to the last two calendar months (UTC dates, inclusive).
pnpm cost:report
pnpm cost:report --from 2026-09-08 --to 2026-11-08 --output benchmarks/api-cost-report.json

# Fetch the public API's live rates; no generation calls or credentials.
pnpm cost:prices

# Recover actual cost by exact generation ID into a new ledger copy.
# Requires OPENROUTER_API_KEY; existing output files are never overwritten.
pnpm cost:reconcile benchmarks/api-usage/<ledger>.jsonl /tmp/reconciled.jsonl
pnpm cost:report --ledger /tmp/reconciled.jsonl --output /tmp/costs.json
```

Reconciliation performs read-only `/generation?id=...` requests. It fails on
missing/expired IDs or authentication errors and leaves the original untouched.
It does not associate unrelated account spend with benchmark runs by timestamp.
Historical files in this audit have no IDs to look up. `--ledger` reports
separate per-model ledger totals (including rejected responses), deduplicating
exact response IDs; do not add these to sample totals.

## Documented rate estimates

`pricing/api-prices.json` contains a reviewed snapshot of flat-rate OpenRouter
models used in the audit window, plus verified native OpenAI, Anthropic and
Google rates for recent models. Native entries cover standard text requests.
Google Argon's introductory rates expire December 1; OpenAI entries reject
long-context requests and Haiku 5.5 rejects prompts above its supported tier.
Anthropic cache writes are left unpriced because TTL changes their rate. `cost:prices` fetches all flat-rate models to
`pricing/openrouter-current.json` for review. Models with context overrides or
per-request charges are deliberately omitted. Review and merge new snapshots
into the catalog; do not replace old date ranges needed for historical costing.
`COST_PRICING_FILE` can select another JSON catalog during generation; use the
report's `--pricing` option to select the same catalog when reporting.

Each entry must use an exact provider/model pair, USD **per token**, source URL,
retrieval timestamp, and effective interval `[effectiveFrom, effectiveTo)`.
Current snapshots start at retrieval time; they do not apply retroactively.
Missing cache prices, usage or applicable rate produce an unavailable cost.
Cache reads/writes are subtracted from normalized total input before charging
base input. Reasoning is already included in output, including Google's
separately reported thoughts. Estimates and API-reported charges remain distinct.
Native provider entries can be added from their documented standard text rates;
include `maxInputTokens` to reject requests beyond a supported context tier.
Leave unsupported cache-write TTLs or billing modes unpriced.

## Sources checked

- [OpenRouter usage and charged cost](https://openrouter.ai/docs/cookbook/administration/usage-accounting)
- [OpenRouter live model pricing](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)
- [OpenRouter generation lookup](https://openrouter.ai/docs/api/api-reference/generations/get-generation)
- [OpenAI Responses usage](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [OpenAI pricing and context tiers](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
- [Anthropic pricing and cache accounting](https://platform.claude.com/docs/en/about-claude/pricing)
- [Google usage metadata](https://ai.google.dev/api/generate-content#UsageMetadata)

Experimental: validate observed costs against actual provider account billing
before presenting these figures as complete benchmark spend.
