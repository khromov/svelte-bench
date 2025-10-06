package bridge

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
)

// EventType represents different event types from the benchmark runner
type EventType string

const (
	EventTestStart      EventType = "test_start"
	EventTestComplete   EventType = "test_complete"
	EventSampleProgress EventType = "sample_progress"
	EventRateLimit      EventType = "rate_limit"
	EventError          EventType = "error"
	EventComplete       EventType = "complete"
)

// BenchmarkEvent represents an event from the benchmark runner
type BenchmarkEvent struct {
	Type         EventType              `json:"type"`
	Test         string                 `json:"test,omitempty"`
	Sample       int                    `json:"sample,omitempty"`
	Total        int                    `json:"total,omitempty"`
	Passed       bool                   `json:"passed,omitempty"`
	RetryAfter   int                    `json:"retryAfter,omitempty"`
	Error        string                 `json:"error,omitempty"`
	PassAtOne    float64                `json:"passAtOne,omitempty"`
	PassAtTen    float64                `json:"passAtTen,omitempty"`
	ResultsSaved string                 `json:"resultsSaved,omitempty"`
	RawData      map[string]interface{} `json:"-"`
}

// ParseEvents reads and parses events from a reader
func ParseEvents(reader io.Reader, callback func(BenchmarkEvent)) error {
	scanner := bufio.NewScanner(reader)

	for scanner.Scan() {
		line := scanner.Text()

		// Try to parse as JSON
		var event BenchmarkEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			// Not JSON, might be regular output - skip or log
			continue
		}

		callback(event)
	}

	return scanner.Err()
}

// EventHandler is a function that handles benchmark events
type EventHandler func(BenchmarkEvent)

// ParseEventStream parses events from an io.ReadCloser
func ParseEventStream(stream io.ReadCloser, handler EventHandler) error {
	defer stream.Close()

	scanner := bufio.NewScanner(stream)
	for scanner.Scan() {
		line := scanner.Text()

		var event BenchmarkEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			// Skip non-JSON lines
			continue
		}

		handler(event)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading stream: %w", err)
	}

	return nil
}
