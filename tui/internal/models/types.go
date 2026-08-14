package models

import (
	"svelte-bench/tui/internal/config"

	tea "charm.land/bubbletea/v2"
)

func newView(content string) tea.View {
	view := tea.NewView(content)
	view.AltScreen = true
	return view
}

// Screen represents different screens in the TUI
type Screen int

const (
	ScreenWelcome Screen = iota
	ScreenAPIKeyConfig
	ScreenExecutionMode
	ScreenProviderModelSelect
	ScreenBenchmark
	ScreenResults
)

// SharedState holds state shared across screens
type SharedState struct {
	Config                   *config.Config
	ValidatedProviders       map[string]bool
	ProviderValidationErrors map[string]string
	Provider                 string
	ProviderKey              string
	Model                    string
	Parallel                 bool
	Madmax                   bool
	Results                  []TestResult
	Completed                bool
	Error                    string
}

// TestResult holds results for a single test
type TestResult struct {
	TestName     string
	Current      int
	Total        int
	Passed       bool
	PassAtOne    float64
	PassAtTen    float64
	Status       TestStatus
	RetryAfter   int
	RetryAttempt int
}

// TestStatus represents the status of a test
type TestStatus int

const (
	StatusQueued TestStatus = iota
	StatusRunning
	StatusRateLimit
	StatusCompleted
	StatusFailed
)
