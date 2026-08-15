package models

import (
	"math"
	"strings"
	"testing"

	"svelte-bench/tui/internal/bridge"
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

	view := model.View().Content
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

func TestBenchmarkAggregatesProgressAndScoresAcrossSelectedModels(t *testing.T) {
	model := NewBenchmarkModel(&SharedState{Provider: "openrouter", Model: "model-a,model-b"})
	if model.totalSamples != 180 {
		t.Fatalf("expected 180 total samples for two models, got %d", model.totalSamples)
	}

	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestStart, Test: "counter", Model: "model-a", Total: 10})
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventSampleProgress, Test: "counter", Model: "model-a", Sample: 10, Total: 10})
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestComplete, Test: "counter", Model: "model-a", Total: 10, Passed: true, PassAtOne: 0.8})

	if model.tests["counter"].Status != StatusRunning {
		t.Fatal("category should remain running until every selected model completes")
	}

	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestStart, Test: "counter", Model: "model-b", Total: 10})
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestComplete, Test: "counter", Model: "model-b", Total: 10, Passed: true, PassAtOne: 0.4})

	test := model.tests["counter"]
	if test.Current != 20 || model.currentCount != 20 {
		t.Fatalf("expected aggregate progress 20/20, got test=%d overall=%d", test.Current, model.currentCount)
	}
	if test.Status != StatusCompleted {
		t.Fatalf("expected completed aggregate category, got %v", test.Status)
	}
	if math.Abs(test.PassAtOne-0.6) > 0.000001 {
		t.Fatalf("expected average pass@1 of 0.6, got %v", test.PassAtOne)
	}
}

func TestBenchmarkRejectsIncompleteCompletion(t *testing.T) {
	state := &SharedState{Provider: "openai", Model: "gpt-4o"}
	model := NewBenchmarkModel(state)

	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestStart, Test: "counter", Total: 10})
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventSampleProgress, Test: "counter", Sample: 3, Total: 10})
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventComplete})

	if state.Error == "" {
		t.Fatal("expected incomplete benchmark to be rejected")
	}
	if !strings.Contains(state.Error, "hello-world") {
		t.Fatalf("expected missing test names in error, got %q", state.Error)
	}
	if len(state.Results) != 0 {
		t.Fatalf("expected no results for incomplete benchmark, got %d", len(state.Results))
	}
}

func TestBenchmarkAcceptsFullyRunFailedCategories(t *testing.T) {
	state := &SharedState{Provider: "openai", Model: "gpt-4o"}
	model := NewBenchmarkModel(state)

	for _, name := range model.testOrder {
		test := model.tests[name]
		test.Status = StatusFailed
		test.Current = test.Total
	}
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventComplete})

	if state.Error != "" {
		t.Fatalf("expected fully executed failed categories to complete, got %q", state.Error)
	}
	if len(state.Results) != len(model.testOrder) {
		t.Fatalf("expected %d results, got %d", len(model.testOrder), len(state.Results))
	}
}
