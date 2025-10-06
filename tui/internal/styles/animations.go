package styles

import (
	"time"

	"github.com/charmbracelet/lipgloss"
)

// Spinner frames for loading animations
var SpinnerFrames = []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}

// GetSpinnerFrame returns the current spinner frame based on time
func GetSpinnerFrame(startTime time.Time) string {
	elapsed := time.Since(startTime)
	frame := int(elapsed.Milliseconds()/100) % len(SpinnerFrames)
	return lipgloss.NewStyle().Foreground(OrangePrimary).Render(SpinnerFrames[frame])
}

// Dot frames for simpler loading
var DotFrames = []string{"   ", ".  ", ".. ", "..."}

// GetDotFrame returns the current dot frame
func GetDotFrame(startTime time.Time) string {
	elapsed := time.Since(startTime)
	frame := int(elapsed.Milliseconds()/300) % len(DotFrames)
	return lipgloss.NewStyle().Foreground(OrangePrimary).Render(DotFrames[frame])
}

// Pulse returns a pulsing opacity effect (simulated with different shades)
func GetPulseColor(startTime time.Time) lipgloss.Color {
	elapsed := time.Since(startTime)
	// Oscillate between colors every 500ms
	if (elapsed.Milliseconds()/500)%2 == 0 {
		return OrangePrimary
	}
	return OrangeMid
}
