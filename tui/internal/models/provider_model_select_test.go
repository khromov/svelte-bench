package models

import (
	"strings"
	"testing"
	"time"

	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/config"

	tea "charm.land/bubbletea/v2"
)

func modelSelectionFixture() ProviderModelSelectModel {
	state := &SharedState{
		Config:      &config.Config{APIKeys: map[string]string{"OPENROUTER_API_KEY": "test-key"}},
		ProviderKey: "OPENROUTER_API_KEY",
	}
	model := NewModelSelectionModel(state)
	model.models = []bridge.Model{
		{ID: "openai/gpt-4"},
		{ID: "anthropic/claude-sonnet-4"},
	}
	model.filteredModels = model.models
	return model
}

func TestModelSelectionMarksMultipleModelsAndRunsThemInCatalogOrder(t *testing.T) {
	model := modelSelectionFixture()

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeySpace})
	model = updated.(ProviderModelSelectModel)
	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeyDown})
	model = updated.(ProviderModelSelectModel)
	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeySpace})
	model = updated.(ProviderModelSelectModel)

	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	if _, ok := updated.(BenchmarkModel); !ok {
		t.Fatalf("enter should start a benchmark, got %T", updated)
	}
	if got, want := model.state.Model, "openai/gpt-4,anthropic/claude-sonnet-4"; got != want {
		t.Fatalf("expected comma-separated selected models %q, got %q", want, got)
	}
}

func TestModelSelectionKeepsMarksWhileFiltering(t *testing.T) {
	model := modelSelectionFixture()
	model.selectedModels[model.models[0].ID] = true
	model.modelInput.SetValue("claude")
	model.filteredModels = bridge.FuzzySearch(model.models, model.modelInput.Value())

	if got := model.selectedModelIDs(); len(got) != 1 || got[0] != "openai/gpt-4" {
		t.Fatalf("filtering should preserve marked models, got %#v", got)
	}
}

func TestOpenRouterModelRowShowsCatalogDate(t *testing.T) {
	model := modelSelectionFixture()
	model.width = 90
	row := model.renderModelRow(bridge.Model{
		ID:      "openai/gpt-4",
		AddedAt: time.Date(2023, time.August, 24, 0, 0, 0, 0, time.UTC),
	}, true)

	if !strings.Contains(row, "Added 2023-08-24") {
		t.Fatalf("expected OpenRouter catalog date in row, got %q", row)
	}
}
