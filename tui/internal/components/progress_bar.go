package components

import (
	"fmt"

	"svelte-bench/tui/internal/styles"

	"github.com/charmbracelet/lipgloss"
)

// ProgressBar represents a visual progress indicator
type ProgressBar struct {
	Current   int
	Total     int
	Width     int
	ShowLabel bool
	Label     string
}

// Render renders the progress bar
func (p ProgressBar) Render() string {
	if p.Width == 0 {
		p.Width = 40
	}

	bar := styles.RenderProgressBar(p.Current, p.Total, p.Width)

	if p.ShowLabel {
		label := p.Label
		if label == "" {
			label = fmt.Sprintf("%d/%d", p.Current, p.Total)
		}
		labelStyle := lipgloss.NewStyle().Foreground(styles.GrayMedium).MarginLeft(2)
		return bar + labelStyle.Render(label)
	}

	return bar
}

// RenderWithPercent renders the progress bar with percentage
func (p ProgressBar) RenderWithPercent() string {
	return styles.RenderProgressBarWithPercentage(p.Current, p.Total, p.Width)
}

// LargeProgressBar creates a styled progress section with title
type LargeProgressBar struct {
	Title   string
	Current int
	Total   int
	Width   int
}

// Render renders a large progress bar with title and percentage
func (lp LargeProgressBar) Render() string {
	if lp.Width == 0 {
		lp.Width = 50
	}

	titleLine := lipgloss.NewStyle().
		Foreground(styles.OrangePrimary).
		Bold(true).
		Render(lp.Title)

	progressLine := styles.RenderProgressBarWithPercentage(lp.Current, lp.Total, lp.Width)

	countLine := lipgloss.NewStyle().
		Foreground(styles.GrayMedium).
		Render(fmt.Sprintf("%d / %d", lp.Current, lp.Total))

	box := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(styles.OrangeMid).
		Padding(1, 2).
		Width(lp.Width + 10)

	content := lipgloss.JoinVertical(
		lipgloss.Left,
		titleLine,
		"",
		progressLine,
		"",
		countLine,
	)

	return box.Render(content)
}
