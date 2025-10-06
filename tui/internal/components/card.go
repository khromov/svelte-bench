package components

import (
	"svelte-bench/tui/internal/styles"

	"github.com/charmbracelet/lipgloss"
)

// Card represents a UI card component
type Card struct {
	Title       string
	Content     string
	Icon        string
	Selected    bool
	Width       int
	Height      int
	Centered    bool
	StatusIcon  string // ✓, ○, ⚠, etc.
	StatusColor lipgloss.Color
}

// Render renders the card
func (c Card) Render() string {
	var content string

	// Build content
	if c.Icon != "" {
		iconStyle := lipgloss.NewStyle().Foreground(styles.OrangePrimary).Bold(true)
		content += iconStyle.Render(c.Icon) + " "
	}

	if c.Title != "" {
		titleStyle := lipgloss.NewStyle().Bold(true)
		if c.Selected {
			titleStyle = titleStyle.Foreground(styles.OrangePrimary)
		}
		content += titleStyle.Render(c.Title)
	}

	if c.StatusIcon != "" {
		statusStyle := lipgloss.NewStyle().Foreground(c.StatusColor).MarginLeft(2)
		content += statusStyle.Render(c.StatusIcon)
	}

	if c.Content != "" {
		contentStyle := lipgloss.NewStyle().Foreground(styles.GrayMedium)
		content += "\n" + contentStyle.Render(c.Content)
	}

	// Apply card style
	style := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		Padding(1, 2)

	if c.Width > 0 {
		style = style.Width(c.Width)
	}

	if c.Height > 0 {
		style = style.Height(c.Height)
	}

	if c.Centered {
		style = style.Align(lipgloss.Center)
	}

	if c.Selected {
		style = style.BorderForeground(styles.OrangePrimary).Bold(true)
	} else {
		style = style.BorderForeground(styles.GrayMedium)
	}

	return style.Render(content)
}

// LargeCard represents a large selection card
type LargeCard struct {
	Icon     string
	Title    string
	Subtitle string
	Selected bool
}

// Render renders a large card
func (lc LargeCard) Render() string {
	iconStyle := lipgloss.NewStyle().
		Foreground(styles.OrangePrimary).
		Bold(true).
		Align(lipgloss.Center).
		Width(50)

	titleStyle := lipgloss.NewStyle().
		Bold(true).
		Align(lipgloss.Center).
		Width(50)

	subtitleStyle := lipgloss.NewStyle().
		Foreground(styles.GrayMedium).
		Align(lipgloss.Center).
		Width(50)

	if lc.Selected {
		titleStyle = titleStyle.Foreground(styles.OrangePrimary)
	}

	content := lipgloss.JoinVertical(
		lipgloss.Center,
		"",
		iconStyle.Render(lc.Icon),
		"",
		titleStyle.Render(lc.Title),
		"",
		subtitleStyle.Render(lc.Subtitle),
		"",
	)

	cardStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		Padding(1, 2).
		Width(50).
		Align(lipgloss.Center)

	if lc.Selected {
		cardStyle = cardStyle.BorderForeground(styles.OrangePrimary).BorderStyle(lipgloss.ThickBorder())
	} else {
		cardStyle = cardStyle.BorderForeground(styles.GrayMedium)
	}

	return cardStyle.Render(content)
}
