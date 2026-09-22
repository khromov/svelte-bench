package models

import (
	"strings"
	"testing"

	"github.com/charmbracelet/x/ansi"
)

func TestResultsViewPutsViewBenchmarksFirst(t *testing.T) {
	model := NewResultsModel(&SharedState{Provider: "openai", Model: "gpt-4o"})
	view := ansi.Strip(model.View().Content)

	viewIndex := strings.Index(view, "View benchmarks")
	runIndex := strings.Index(view, "Run another benchmark")
	if viewIndex < 0 || runIndex < 0 || viewIndex > runIndex {
		t.Fatal("completed benchmark actions should put View benchmarks first")
	}
}
