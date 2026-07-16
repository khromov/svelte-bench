package models

import (
	"strings"
	"testing"
)

func TestBenchmarkViewShowsAllTestsAndPercentageScores(t *testing.T) {
	model := NewBenchmarkModel(&SharedState{Provider: "openai", Model: "gpt-4o-mini"})
	model.height = 24
	model.currentCount = model.totalSamples
	model.running = false
	for _, name := range model.testOrder {
		model.tests[name].Status = StatusCompleted
		model.tests[name].Current = model.tests[name].Total
		model.tests[name].PassAtOne = 0.75
	}

	view := model.View()
	for _, name := range model.testOrder {
		if !strings.Contains(view, name) {
			t.Errorf("benchmark view omitted test category %q", name)
		}
	}
	if !strings.Contains(view, "75%") {
		t.Fatal("benchmark view should render pass scores as percentages")
	}
	if !strings.Contains(view, "Done") {
		t.Fatal("benchmark view should mark completed samples as Done")
	}
	if !strings.Contains(view, "Overall score: 75% (9/9 tests complete)") {
		t.Fatal("benchmark view should show the category-based overall score")
	}
	if strings.Contains(view, "0.75") {
		t.Fatal("benchmark view should not render decimal pass scores")
	}
}
