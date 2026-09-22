package models

import (
	"errors"
	"strings"
	"testing"

	"svelte-bench/tui/internal/config"

	tea "charm.land/bubbletea/v2"
)

func TestAPIKeyPromptAcceptsPasteWithoutDisplayingKey(t *testing.T) {
	const key = "test-pasted-secret-123"
	state := &SharedState{Config: &config.Config{APIKeys: map[string]string{}}}
	model := NewAPIKeyPromptModel(state, config.Provider{Name: "OpenRouter", EnvKey: "OPENROUTER_API_KEY"})

	updated, _ := model.Update(tea.PasteMsg{Content: key})
	model = updated.(APIKeyPromptModel)
	if got := model.input.Value(); got != key {
		t.Fatalf("pasted key = %q, want %q", got, key)
	}
	if view := model.View().Content; strings.Contains(view, key) {
		t.Fatal("API key appeared in the prompt")
	}
}

func TestAPIKeyConfigAcceptsPasteWithoutDisplayingKey(t *testing.T) {
	const key = "test-pasted-secret-456"
	state := &SharedState{Config: &config.Config{APIKeys: map[string]string{}}}
	model := NewAPIKeyConfigModel(state)

	updated, _ := model.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	model = updated.(APIKeyConfigModel)
	updated, _ = model.Update(tea.PasteMsg{Content: key})
	model = updated.(APIKeyConfigModel)
	if got := model.input.Value(); got != key {
		t.Fatalf("pasted key = %q, want %q", got, key)
	}
	if view := model.View().Content; strings.Contains(view, key) {
		t.Fatal("API key appeared in the configuration screen")
	}
}

func TestAPIKeyValidationErrorDoesNotDisplayKey(t *testing.T) {
	const key = "test-secret-in-error"
	state := &SharedState{Config: &config.Config{APIKeys: map[string]string{}}}
	model := NewAPIKeyPromptModel(state, config.Provider{Name: "Google", EnvKey: "GOOGLE_API_KEY"})
	model.input.SetValue(key)

	updated, _ := model.Update(apiKeyValidatedMsg{key: key, err: errors.New("request URL contains " + key)})
	model = updated.(APIKeyPromptModel)
	if view := model.View().Content; strings.Contains(view, key) {
		t.Fatal("API key appeared in the validation error")
	}
}
