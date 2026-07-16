# SvelteBench TUI

A beautiful terminal user interface for running Svelte component benchmarks, built with [Bubble Tea](https://github.com/charmbracelet/bubbletea).

## Features

- 🎨 **Ultra-modern UI** with orange gradient theming
- 🔑 **Self-contained** - No .env file required! Configure API keys directly in the TUI
- 🚀 **Interactive** provider and model selection with autocomplete
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
│   ├── styles/              # Orange gradient theme system
│   │   ├── theme.go         # Base styles & colors
│   │   ├── gradients.go     # Gradient rendering
│   │   └── animations.go    # Spinners & animations
│   ├── components/          # Reusable UI components
│   │   ├── progress_bar.go  # Progress visualization
│   │   ├── masked_input.go  # Secure API key input
│   │   └── card.go          # Selection cards
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

🚧 **In Development** 🚧

The TUI infrastructure is complete with:
- ✅ Styles system (orange gradients, animations)
- ✅ Core components (progress bars, cards, masked inputs)
- ✅ Config storage & API key validation
- ✅ TypeScript bridge (runner, parser, model API)
- ✅ TUI event emitter in TypeScript

Run the TUI with `pnpm tui`. The existing TypeScript runner remains available
for scripts and CI via `pnpm run-tests`, and all existing environment
variables remain supported there.

## Contributing

To extend the TUI:

1. **Add new screens**: Create models in `internal/models/`
2. **Customize styling**: Edit `internal/styles/theme.go`
3. **Add components**: Create in `internal/components/`

## Tech Stack

- [Bubble Tea](https://github.com/charmbracelet/bubbletea) - TUI framework
- [Lip Gloss](https://github.com/charmbracelet/lipgloss) - Styling
- [Bubbles](https://github.com/charmbracelet/bubbles) - Components
- Go 1.21+
