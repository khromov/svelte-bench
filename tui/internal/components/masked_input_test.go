package components

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
)

func TestMaskedInputHidesTypedAndPrefilledKeys(t *testing.T) {
	input := NewMaskedInput("Enter API key", 50)
	input.Focus()
	input.Update(tea.KeyPressMsg{Code: 'x', Text: "x"})
	if got := input.Value(); got != "x" {
		t.Fatalf("typed value = %q, want x", got)
	}
	if strings.Contains(input.View(), "x") {
		t.Fatal("typed key appeared in the input")
	}

	const key = "existing-secret-key"
	input.SetValue(key)
	if got := input.Value(); got != key {
		t.Fatalf("prefilled value = %q, want %q", got, key)
	}
	if strings.Contains(input.View(), key) {
		t.Fatal("prefilled key appeared in the input")
	}
}
