# Experimental API cost tracking

The September 8–November 8, 2026 audit covers 36 API runs (3,157 samples). All
lack saved token usage, response IDs and billed cost. The machine-readable audit
is `benchmarks/api-cost-report.json`. Its null totals mean **unknown**, not free.
Saved, cleaned component source cannot recover reasoning, caching, retries or
exact provider tokenization. Current rates cannot establish historical rates.
No historical result files or scores were changed.

## Future runs

The OpenAI, Anthropic, Google, OpenRouter, Fireworks, Meta, xAI, Reflection,
Tinker, Z.ai, Moonshot, MiniMax and Cursor adapters capture response usage and IDs.
Sequential and parallel results save an `apiUsage` array on each sample and
preserve it across checkpoints/resumption. An asynchronous context associates
requests with their sample, including provider retries; there is no shared
"last response" field on providers. Ollama is excluded. Cursor uses a fresh SDK agent per sample and retrieves that
agent's billed usage; delayed or failed billing lookups retain token usage.

Requests are also appended immediately to `benchmarks/api-usage/*.jsonl`, before
cleaning and testing. These ledgers retain returned responses rejected by code
validation, including attempts that never become benchmark samples. Back them
up along with checkpoints. They contain usage and IDs, not prompts, outputs or
credentials. The report of result files covers saved samples only; these
ledgers are required to inspect interrupted runs and discarded samples.
Validation probes outside benchmark samples and failed HTTP requests without a
usage response are excluded. Provider SDK retries without returned usage cannot
be reconstructed. This is not an account invoice.

OpenRouter's `usage.cost`, xAI's `usage.cost_in_usd_ticks` (1e10 ticks/USD), and
Cursor's `chargedCents` (100 cents/USD) are preferred, including genuine zero
charges. Other
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
Cursor rows with a saved `billingId` can also be reconciled through the SDK
using `CURSOR_API_KEY` after billing settles. Historical files in this audit
have no IDs to look up. `--ledger` reports
separate per-model ledger totals (including rejected responses), deduplicating
exact response IDs; do not add these to sample totals.

## Documented rate estimates

`pricing/api-prices.json` contains a reviewed snapshot of flat-rate OpenRouter
models used in the audit window, plus verified native OpenAI, Anthropic and
Google rates for recent models. Native entries cover standard text requests.
Google Argon's introductory rates expire December 1; OpenAI entries reject
long-context requests and Haiku 5.5 rejects prompts above its supported tier.
Anthropic cache writes use distinct 5-minute and 1-hour rates when returned in
the usage breakdown. `cost:prices` fetches all flat-rate models to
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

## Rendered benchmark costs

The SvelteKit leaderboard displays run cost in USD, with per-test totals in model
panels and per-sample charges and token counts in the Samples dialog. Totals use
only the samples in the selected benchmark result (the merged leaderboard uses
the selected run for each model), including all saved returned retry attempts.
They do not add historical runs or separate ledgers to those totals.

API-reported, estimated and mixed costs are labeled. Partial coverage displays
the recorded amount with a Partial label, never as a complete total. Missing
historical usage shows `--`; usage without a usable price shows
Unavailable. Local models have no API cost. Small charges below $0.0001 remain
visible instead of rounding to a free request. Auxiliary cost-report JSON is
excluded from benchmark routes and raw-result downloads.

## Provider coverage audit

Cost calculation is supported across all providers with verified request charges
or applicable native rates. This is provider coverage, not a claim that every
model or billing mode has a price. Unknown future model IDs still require a
verified native rate unless their API reports a billed charge.

| Provider   | Cost path                                | Coverage / limitations                                                                     |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| OpenRouter | API-reported `usage.cost`                | Model independent; account charge can exclude upstream BYOK billing                        |
| xAI        | API-reported `cost_in_usd_ticks` / 1e10  | Model independent; raw integer ticks retained                                              |
| Cursor     | SDK `getUsage().cost.chargedCents` / 100 | Fresh agent per sample; eventual billing may be unavailable initially                      |
| OpenAI     | Native rate estimate                     | Current Sol/Luna rates and cache pricing; unsupported long-context tiers remain unknown    |
| Anthropic  | Native rate estimate                     | Current Opus/Sonnet/Haiku rates, separate 5m/1h cache writes; Haiku context limit enforced |
| Google     | Native rate estimate                     | Argon introductory rate with explicit expiration                                           |
| MiniMax    | Native rate estimate                     | M3.1 Flash and standard M3, with M3 context limit                                          |
| Moonshot   | Native rate estimate                     | K3/K3.1 and current K2 models, cache reads and writes                                      |
| Z.ai       | Native rate estimate                     | Current GLM text models and documented free Flash models                                   |
| Meta       | Native rate estimate                     | Muse Spark 1.1–1.3, explicit Contributor model IDs                                         |
| Tinker     | Native sampling rate estimate            | Exact IDs from the published model and serverless catalogs, not training prices            |
| Fireworks  | Native rate estimate                     | Supported standard serverless model IDs; GPU-hour/on-demand deployments remain unknown     |
| Reflection | Tokens captured; price unknown           | No public first-party price or documented billed USD field found in the developer docs     |
| Ollama     | No API cost                              | Local compute/electricity not estimated                                                    |

`provider-cost-coverage.test.ts` verifies native cache calculations for each
estimate provider, model-independent actual charges for OpenRouter/xAI/Cursor,
and unknown Reflection cost. No account-wide spending is assigned to a sample.

Additional first-party sources checked:

- [xAI cost units](https://docs.x.ai/developers/cost-tracking)
- [Cursor SDK usage and billed cents](https://cursor.com/docs/sdk/typescript)
- [MiniMax native rates](https://platform.minimax.io/docs/pricing/overview)
- [Kimi native rates](https://platform.kimi.ai/docs/pricing/chat)
- [Kimi cache accounting](https://platform.kimi.ai/docs/guide/context-caching)
- [Z.ai native rates](https://docs.z.ai/guides/overview/pricing)
- [Meta native rates](https://llama.developer.meta.com/docs/pricing-rate-limits)
- [Tinker native model rates](https://tinker-docs.thinkingmachines.ai/tinker/models.json)
- [Tinker serverless rates](https://tinker-docs.thinkingmachines.ai/tinker/serverless.json)
- [Fireworks standard serverless rates](https://docs.fireworks.ai/serverless/pricing)
- [Reflection usage fields](https://developers.reflection.ai/text-generation)

Every leaderboard and per-test table header toggles ascending/descending.
Unknown and partial cost totals stay at the bottom in both directions.
