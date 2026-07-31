package models

import (
	"errors"
	"strings"
	"testing"
	"time"

	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/config"

	"charm.land/bubbles/v2/spinner"
	tea "charm.land/bubbletea/v2"
)

func TestLoadModelsReturnsLoadingModelImmediately(t *testing.T) {
	model := modelSelectionFixture()
	loading, cmd := model.loadModels()

	if !loading.loadingModels {
		t.Fatal("model should be loading before the fetch command runs")
	}
	if cmd == nil {
		t.Fatal("loading transition should return the fetch and spinner command")
	}
	if loading.modelLoadError != "" {
		t.Fatalf("loading transition should clear stale fetch errors, got %q", loading.modelLoadError)
	}
}

func TestExecutionModeReturnsModelSelectionAlreadyLoading(t *testing.T) {
	fixture := modelSelectionFixture()
	execution := NewExecutionModeModel(fixture.state)

	updated, cmd := execution.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	selection, ok := updated.(ModelSelectModel)
	if !ok {
		t.Fatalf("enter should open model selection, got %T", updated)
	}
	if !selection.loadingModels {
		t.Fatal("model selection should be loading as soon as it is returned")
	}
	if cmd == nil {
		t.Fatal("execution-mode transition should return the model-loading command")
	}
}

func TestModelsLoadedSuccessEndsLoadingAndPopulatesCatalog(t *testing.T) {
	model := modelSelectionFixture()
	model.loadingModels = true
	model.modelLoadError = "stale error"
	want := []bridge.Model{{ID: "openai/gpt-4.1"}, {ID: "anthropic/claude-sonnet-4"}}

	updated, cmd := model.Update(modelsLoadedMsg{models: want})
	loaded := updated.(ModelSelectModel)

	if loaded.loadingModels {
		t.Fatal("successful model fetch should end loading")
	}
	if cmd != nil {
		t.Fatal("successful model fetch should not schedule another command")
	}
	if loaded.modelLoadError != "" {
		t.Fatalf("successful model fetch should clear its error, got %q", loaded.modelLoadError)
	}
	if len(loaded.models) != len(want) || loaded.models[0].ID != want[0].ID {
		t.Fatalf("successful model fetch should populate the catalog, got %#v", loaded.models)
	}
	if len(loaded.filteredModels) != len(want) || loaded.filteredModels[1].ID != want[1].ID {
		t.Fatalf("successful model fetch should populate filtered models, got %#v", loaded.filteredModels)
	}
}

func TestModelsLoadedErrorEndsLoadingAndRetainsDedicatedError(t *testing.T) {
	model := modelSelectionFixture()
	model.loadingModels = true
	want := errors.New("catalog unavailable")

	updated, cmd := model.Update(modelsLoadedMsg{err: want})
	loaded := updated.(ModelSelectModel)

	if loaded.loadingModels {
		t.Fatal("failed model fetch should end loading")
	}
	if cmd != nil {
		t.Fatal("failed model fetch should not schedule another command")
	}
	if loaded.modelLoadError != want.Error() {
		t.Fatalf("expected dedicated fetch error %q, got %q", want, loaded.modelLoadError)
	}
}

func TestLoadingSpinnerOnlyReschedulesWhileLoading(t *testing.T) {
	model := modelSelectionFixture()
	model.loadingModels = true
	tick := spinner.TickMsg{ID: model.loadingSpinner.ID()}

	updated, cmd := model.Update(tick)
	model = updated.(ModelSelectModel)
	if cmd == nil {
		t.Fatal("spinner tick should schedule its successor while loading")
	}

	model.loadingModels = false
	_, cmd = model.Update(tick)
	if cmd != nil {
		t.Fatal("spinner tick should stop scheduling after loading ends")
	}
}

func modelSelectionFixture() ModelSelectModel {
	state := &SharedState{
		Config:      &config.Config{APIKeys: map[string]string{"OPENROUTER_API_KEY": "test-key"}},
		ProviderKey: "OPENROUTER_API_KEY",
	}
	model := NewModelSelectModel(state)
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
	model = updated.(ModelSelectModel)
	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeyDown})
	model = updated.(ModelSelectModel)
	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeySpace})
	model = updated.(ModelSelectModel)

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

func TestProviderSelectionRoutesMissingKeyToAPIKeyPrompt(t *testing.T) {
	state := &SharedState{Config: &config.Config{APIKeys: map[string]string{}}}
	model := NewProviderSelectModel(state)

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	if _, ok := updated.(APIKeyPromptModel); !ok {
		t.Fatalf("provider without a key should open API key prompt, got %T", updated)
	}
	if state.ProviderKey != model.providers[model.selectedProvider].EnvKey {
		t.Fatalf("selected provider key should be retained in shared state, got %q", state.ProviderKey)
	}
}

func TestProviderSelectionRoutesConfiguredKeyToExecutionMode(t *testing.T) {
	state := &SharedState{
		Config:             &config.Config{APIKeys: map[string]string{"ANTHROPIC_API_KEY": "test-key"}},
		ValidatedProviders: map[string]bool{"ANTHROPIC_API_KEY": true},
	}
	model := NewProviderSelectModel(state)
	for i, provider := range model.providers {
		if provider.EnvKey == "ANTHROPIC_API_KEY" {
			model.selectedProvider = i
			break
		}
	}
	model.validating = false

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	if _, ok := updated.(ExecutionModeModel); !ok {
		t.Fatalf("configured provider should open execution mode, got %T", updated)
	}
}

func TestProviderSelectionFromExecutionReturnsToExecutionMode(t *testing.T) {
	model := NewProviderSelectFromExecution(modelSelectionFixture().state)

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeyLeft})
	if _, ok := updated.(ExecutionModeModel); !ok {
		t.Fatalf("left should return to execution mode, got %T", updated)
	}
}

func TestModelSelectionLeftReturnsToProviderSelection(t *testing.T) {
	model := modelSelectionFixture()

	updated, cmd := model.Update(tea.KeyPressMsg{Code: tea.KeyLeft})
	provider, ok := updated.(ProviderSelectModel)
	if !ok {
		t.Fatalf("left should return to provider selection, got %T", updated)
	}
	if provider.exitOnBack {
		t.Fatal("model-to-provider transition should preserve execution-mode back navigation")
	}
	if cmd != nil {
		t.Fatal("model-to-provider transition should not start a command")
	}
}

func TestModelSelectionRunsCustomModelIDWhenCatalogHasNoMatch(t *testing.T) {
	model := modelSelectionFixture()
	model.modelInput.SetValue("custom/vendor-model")
	model.filteredModels = nil

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	if _, ok := updated.(BenchmarkModel); !ok {
		t.Fatalf("custom model ID should start a benchmark, got %T", updated)
	}
	if got, want := model.state.Model, "custom/vendor-model"; got != want {
		t.Fatalf("expected custom model %q, got %q", want, got)
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
