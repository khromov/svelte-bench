package models

import (
	"context"
	"errors"
	"math"
	"strings"
	"testing"
	"time"

	"svelte-bench/tui/internal/bridge"

	tea "charm.land/bubbletea/v2"
)

func TestBenchmarkViewShowsAllTestsAndPercentageScores(t *testing.T) {
	model := NewBenchmarkModel(&SharedState{Provider: "openai", Model: "gpt-4o-mini"})
	model.handleEvent(bridge.BenchmarkEvent{
		Type:   bridge.EventRunStart,
		Models: []bridge.RunModel{{ID: "gpt-4o-mini", SamplesPerTest: 10}},
		Tests:  []string{"hello-world", "counter", "derived", "derived-by", "each", "effect", "props", "snippets", "inspect"},
	})
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
	model := NewBenchmarkModel(&SharedState{Provider: "openrouter", Model: "model-a,model-b,rejected-model"})
	if model.totalSamples != 0 || len(model.tests) != 0 {
		t.Fatal("benchmark topology must remain empty until run_start")
	}
	model.handleEvent(bridge.BenchmarkEvent{
		Type: bridge.EventRunStart,
		Models: []bridge.RunModel{
			{ID: "model-a", SamplesPerTest: 10},
			{ID: "model-b", SamplesPerTest: 1},
		},
		Tests: []string{"counter", "effect"},
	})
	if model.totalSamples != 22 {
		t.Fatalf("expected 22 samples from validated models and unequal schedules, got %d", model.totalSamples)
	}

	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestStart, Test: "counter", Model: "model-a", Total: 10})
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventSampleProgress, Test: "counter", Model: "model-a", Sample: 10, Total: 10})
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestComplete, Test: "counter", Model: "model-a", Total: 10, Passed: true, PassAtOne: 0.8})

	if model.tests["counter"].Status != StatusRunning {
		t.Fatal("category should remain running until every selected model completes")
	}

	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestStart, Test: "counter", Model: "model-b", Total: 1})
	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestComplete, Test: "counter", Model: "model-b", Total: 1, Passed: true, PassAtOne: 0.4})

	test := model.tests["counter"]
	if test.Current != 11 || model.currentCount != 11 {
		t.Fatalf("expected aggregate progress 11/11, got test=%d overall=%d", test.Current, model.currentCount)
	}
	if test.Status != StatusCompleted {
		t.Fatalf("expected completed aggregate category, got %v", test.Status)
	}
	if math.Abs(test.PassAtOne-0.6) > 0.000001 {
		t.Fatalf("expected average pass@1 of 0.6, got %v", test.PassAtOne)
	}

	model.handleEvent(bridge.BenchmarkEvent{Type: bridge.EventTestComplete, Test: "counter", Model: "rejected-model", Total: 10, Passed: true, PassAtOne: 1})
	if test.Current != 11 || model.currentCount != 11 || math.Abs(test.PassAtOne-0.6) > 0.000001 {
		t.Fatal("an unvalidated model must not inflate progress or scores")
	}
}

func TestBenchmarkCancelStopsOwnedRunnerContext(t *testing.T) {
	model := NewBenchmarkModel(&SharedState{Provider: "openai", Model: "gpt-4o-mini"})
	stopped := make(chan struct{})
	model.run = func(ctx context.Context, _ bridge.BenchmarkConfig, _ bridge.EventHandler) error {
		<-ctx.Done()
		close(stopped)
		return ctx.Err()
	}

	go model.runBenchmark()()
	if _, ok := model.waitForEvent()().(benchmarkStartMsg); !ok {
		t.Fatal("expected benchmark start message")
	}
	_, cmd := model.Update(tea.KeyPressMsg(tea.Key{Code: 'c', Mod: tea.ModCtrl}))
	if cmd == nil {
		t.Fatal("expected quit command")
	}

	select {
	case <-stopped:
	case <-time.After(time.Second):
		t.Fatal("runner context was not canceled")
	}
	terminal, ok := model.waitForEvent()().(benchmarkTerminalMsg)
	if !ok || !terminal.canceled {
		t.Fatalf("expected explicit canceled terminal message, got %#v", terminal)
	}
}

func TestBenchmarkRunnerErrorDoesNotOpenResults(t *testing.T) {
	state := &SharedState{}
	model := NewBenchmarkModel(state)
	updated, cmd := model.Update(benchmarkTerminalMsg{err: errors.New("runner failed")})
	if cmd != nil {
		t.Fatal("runner failure must not schedule result navigation")
	}
	if _, ok := updated.(BenchmarkModel); !ok {
		t.Fatalf("runner failure should remain on benchmark screen, got %T", updated)
	}
	if state.Completed {
		t.Fatal("runner failure must not mark the benchmark complete")
	}
	if state.Error != "runner failed" {
		t.Fatalf("expected runner error in shared state, got %q", state.Error)
	}
}

func TestBenchmarkEventErrorCannotBecomeSuccessfulCompletion(t *testing.T) {
	state := &SharedState{}
	model := NewBenchmarkModel(state)
	updated, _ := model.Update(benchmarkEventMsg(bridge.BenchmarkEvent{Type: bridge.EventError, Error: "provider failed"}))
	model = updated.(BenchmarkModel)
	updated, _ = model.Update(benchmarkTerminalMsg{})
	if _, ok := updated.(BenchmarkModel); !ok {
		t.Fatalf("errored benchmark should not navigate to results, got %T", updated)
	}
	if state.Completed {
		t.Fatal("event error must not mark the benchmark complete")
	}
}

func TestBenchmarkSuccessNavigatesToResults(t *testing.T) {
	state := &SharedState{}
	model := NewBenchmarkModel(state)
	updated, cmd := model.Update(benchmarkEventMsg(bridge.BenchmarkEvent{Type: bridge.EventComplete}))
	if _, ok := updated.(BenchmarkModel); !ok {
		t.Fatalf("stream completion event must wait for runner success, got %T", updated)
	}
	if cmd == nil {
		t.Fatal("stream completion should continue waiting for the runner terminal result")
	}
	if state.Completed {
		t.Fatal("stream completion alone must not mark shared state complete")
	}

	model = updated.(BenchmarkModel)
	updated, cmd = model.Update(benchmarkTerminalMsg{})
	if cmd != nil {
		t.Fatal("successful completion should navigate immediately")
	}
	if _, ok := updated.(ResultsModel); !ok {
		t.Fatalf("successful completion should open results, got %T", updated)
	}
	if !state.Completed {
		t.Fatal("successful completion should mark shared state complete")
	}
}
