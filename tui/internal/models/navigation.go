package models

import "time"

var lastEscape time.Time

// DoubleEscapeRequestsExit implements the TUI's double-Esc exit gesture.
func DoubleEscapeRequestsExit() bool {
	now := time.Now()
	double := !lastEscape.IsZero() && now.Sub(lastEscape) <= time.Second
	lastEscape = now
	if double {
		lastEscape = time.Time{}
	}
	return double
}
