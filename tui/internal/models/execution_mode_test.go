package models

import (
	"strings"
	"testing"

	"svelte-bench/tui/internal/config"

	tea "charm.land/bubbletea/v2"
)

func TestExecutionModeShowsAllModesAndDefaultsToParallel(t *testing.T) {
	state := &SharedState{Config: &config.Config{APIKeys: map[string]string{}}}
	model := NewExecutionModeModel(state)

	view := model.View().Content
	if !strings.Contains(view, "MADMAX") {
		t.Fatal("execution mode should show MADMAX")
	}
	if !strings.Contains(view, "Parallel") {
		t.Fatal("execution mode should show Parallel")
	}

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	if state.Madmax || !state.Parallel {
		t.Fatalf("default selection should enable Parallel only: madmax=%v parallel=%v", state.Madmax, state.Parallel)
	}
	if _, ok := updated.(ProviderModelSelectModel); !ok {
		t.Fatalf("enter should continue to model selection, got %T", updated)
	}
}

func TestExecutionModeCanSelectSequential(t *testing.T) {
	state := &SharedState{Config: &config.Config{APIKeys: map[string]string{}}}
	model := NewExecutionModeModel(state)

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeyDown})
	model = updated.(ExecutionModeModel)
	model.Update(tea.KeyPressMsg{Code: tea.KeyEnter})

	if state.Madmax || state.Parallel {
		t.Fatalf("sequential selection should disable concurrent modes: madmax=%v parallel=%v", state.Madmax, state.Parallel)
	}
}

func TestExecutionModeCanSelectMadmax(t *testing.T) {
	state := &SharedState{Config: &config.Config{APIKeys: map[string]string{}}}
	model := NewExecutionModeModel(state)

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeyDown})
	model = updated.(ExecutionModeModel)
	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeyDown})
	model = updated.(ExecutionModeModel)
	model.Update(tea.KeyPressMsg{Code: tea.KeyEnter})

	if !state.Madmax || state.Parallel {
		t.Fatalf("MADMAX selection should disable Parallel: madmax=%v parallel=%v", state.Madmax, state.Parallel)
	}
}
