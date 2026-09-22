package models

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestWelcomeViewPreservesGradientText(t *testing.T) {
	t.Parallel()

	view := NewWelcomeModel(nil).View()
	content := ansi.Strip(view.Content)
	for _, text := range []string{
		"SVELTEBENCH",
		"HumanEval-style component benchmarks for Svelte 5",
		"Press Enter to configure a benchmark run",
	} {
		if !strings.Contains(content, text) {
			t.Fatalf("welcome view is missing %q after gradient rendering: %q", text, content)
		}
	}
}
