package bridge

import (
	"strings"
	"testing"
)

func TestParseEventsPreservesModelIdentity(t *testing.T) {
	var events []BenchmarkEvent
	err := ParseEvents(strings.NewReader(`{"type":"sample_progress","test":"counter","model":"openai/gpt-4","sample":3,"total":10}`+"\n"), func(event BenchmarkEvent) {
		events = append(events, event)
	})
	if err != nil {
		t.Fatalf("ParseEvents returned error: %v", err)
	}
	if len(events) != 1 || events[0].Model != "openai/gpt-4" {
		t.Fatalf("expected model identity to survive event parsing, got %#v", events)
	}
}

func TestParseEventsPreservesRunTopology(t *testing.T) {
	var events []BenchmarkEvent
	err := ParseEvents(strings.NewReader(`{"type":"run_start","models":[{"id":"model-a","samplesPerTest":10},{"id":"model-b","samplesPerTest":1}],"tests":["counter","effect"]}`+"\n"), func(event BenchmarkEvent) {
		events = append(events, event)
	})
	if err != nil {
		t.Fatalf("ParseEvents returned error: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected one event, got %#v", events)
	}
	event := events[0]
	if event.Type != EventRunStart || len(event.Models) != 2 || event.Models[1].SamplesPerTest != 1 {
		t.Fatalf("expected complete run topology, got %#v", event)
	}
	if len(event.Tests) != 2 || event.Tests[1] != "effect" {
		t.Fatalf("expected test names to survive parsing, got %#v", event.Tests)
	}
}
