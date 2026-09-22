package components

import (
	"testing"

	tea "charm.land/bubbletea/v2"
)

func TestMaskedInputHidesTypedAndPrefilledKeys(t *testing.T) {
	input := NewMaskedInput("Enter API key", 50)
	input.Focus()
	emptyView := input.View()
	input.Update(tea.KeyPressMsg{Code: 'x', Text: "x"})
	if got := input.Value(); got != "x" {
		t.Fatalf("typed value = %q, want x", got)
	}
	if input.View() != emptyView {
		t.Fatal("typed key changed the rendered input")
	}

	const key = "existing-secret-key"
	input.SetValue(key)
	if got := input.Value(); got != key {
		t.Fatalf("prefilled value = %q, want %q", got, key)
	}
	if input.View() != emptyView {
		t.Fatal("prefilled key changed the rendered input")
	}
}
