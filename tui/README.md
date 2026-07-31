# SvelteBench TUI

A beautiful terminal user interface for running Svelte component benchmarks, built with [Bubble Tea](https://github.com/charmbracelet/bubbletea).

## Features

- 🎨 **Ultra-modern UI** with orange gradient theming
- 🔑 **Self-contained** - No .env file required! Configure API keys directly in the TUI
- 🚀 **Interactive** provider selection and searchable multi-model runs
- 🗓️ **OpenRouter metadata** with each model's catalog-addition date
- 📊 **Live progress** tracking with animated progress bars
- ⚡ **Parallel or sequential** execution modes

## Quick Start

### Run directly:
```bash
pnpm tui
```

### Build binary:
```bash
pnpm tui:build
./bin/svelte-bench-tui
```

## Architecture

### Directory Structure
```
tui/
├── cmd/tui/                  # Main entry point
├── internal/
│   ├── models/               # Screen state, navigation, and benchmark lifecycle
│   │   ├── provider_model_select.go  # Provider and multi-model selection
│   │   ├── api_key_prompt.go         # On-demand provider key entry
│   │   ├── execution_mode.go         # Sequential/parallel/madmax selection
│   │   ├── benchmark.go              # Live benchmark progress
│   │   └── results.go                # Completed-run summary
│   ├── styles/              # Orange gradient theme system
│   │   ├── theme.go         # Base styles & colors
│   │   ├── gradients.go     # Gradient rendering
│   │   └── animations.go    # Spinners & animations
│   ├── components/          # Reusable UI components
│   │   └── masked_input.go  # Secure API key input
│   ├── config/              # Configuration management
│   │   ├── storage.go       # .env read/write
│   │   └── validator.go     # API key validation
│   └── bridge/              # TypeScript integration
│       ├── runner.go        # Benchmark execution
│       ├── parser.go        # Event stream parsing
│       └── models_api.go    # Model fetching & search
└── go.mod
```

## Current Status

The active flow supports:
- Provider selection with on-demand API-key entry and validation
- Searchable multi-model selection, including OpenRouter release dates
- Sequential, parallel, and madmax execution modes
- Live benchmark progress driven by the TypeScript event stream
- Completed-run summaries and result opening

Run the TUI with `pnpm tui`. The existing TypeScript runner remains available
for scripts and CI via `pnpm run-tests`, and all existing environment
variables remain supported there.

## Contributing

To extend the TUI:

1. **Add new screens**: Create focused models in `internal/models/` and connect
   them through the existing navigation flow
2. **Customize styling**: Edit `internal/styles/theme.go`
3. **Add components**: Create in `internal/components/`

## Tech Stack

- [Bubble Tea](https://github.com/charmbracelet/bubbletea) - TUI framework
- [Lip Gloss](https://github.com/charmbracelet/lipgloss) - Styling
- [Bubbles](https://github.com/charmbracelet/bubbles) - Components
- Go 1.21+
