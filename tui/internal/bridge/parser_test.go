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
