package models

import (
	"fmt"
	"svelte-bench/tui/internal/styles"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// ResultsModel handles results display
type ResultsModel struct {
	state          *SharedState
	selectedOption int
	width          int
	height         int
}

// NewResultsModel creates a new results model
func NewResultsModel(state *SharedState) ResultsModel {
	return ResultsModel{
		state:          state,
		selectedOption: 0,
		width:          80,
		height:         24,
	}
}

func (m ResultsModel) Init() tea.Cmd {
	return nil
}

func (m ResultsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit

		case "up":
			if m.selectedOption > 0 {
				m.selectedOption--
			}

		case "down":
			if m.selectedOption < 1 {
				m.selectedOption++
			}

		case "enter":
			switch m.selectedOption {
			case 0:
				// Run another benchmark
				return NewWelcomeModel(m.state.Config), nil
			case 1:
				// Exit
				return m, tea.Quit
			}
		}
	}

	return m, nil
}

func (m ResultsModel) View() string {
	var lines []string

	// Title
	title := lipgloss.NewStyle().
		Bold(true).
		Foreground(styles.OrangeSuccess).
		Render("✓ BENCHMARK COMPLETE")

	lines = append(lines, title, "")

	// Summary
	totalTests := len(m.state.Results)
	totalPassed := 0
	avgPass := 0.0
	for _, result := range m.state.Results {
		if result.Passed {
			totalPassed++
		}
		avgPass += result.PassAtOne
	}
	if totalTests > 0 {
		avgPass /= float64(totalTests)
	}

	summary := lipgloss.NewStyle().
		Foreground(styles.OrangeMid).
		Render(fmt.Sprintf("%s • %s", m.state.Provider, m.state.Model))

	passColor := styles.OrangeSuccess
	if avgPass < 0.5 {
		passColor = styles.OrangeError
	} else if avgPass < 0.7 {
		passColor = styles.OrangeWarning
	}

	stats := lipgloss.NewStyle().
		Foreground(passColor).
		Bold(true).
		Render(fmt.Sprintf("Average pass@1: %.2f (%d/%d tests passed)", avgPass, totalPassed, totalTests))

	lines = append(lines, summary, stats, "", "")

	// Results table
	resultsHeader := lipgloss.NewStyle().
		Foreground(styles.OrangeMid).
		Render("Results:")
	lines = append(lines, resultsHeader)

	maxResults := m.height - 14
	if maxResults < 3 {
		maxResults = 3
	}
	if maxResults > len(m.state.Results) {
		maxResults = len(m.state.Results)
	}

	for i := 0; i < maxResults; i++ {
		result := m.state.Results[i]

		// Icon
		icon := "✓"
		iconColor := styles.OrangeSuccess
		if !result.Passed || result.PassAtOne < 0.5 {
			icon = "✗"
			iconColor = styles.OrangeError
		} else if result.PassAtOne < 0.7 {
			icon = "!"
			iconColor = styles.OrangeWarning
		}

		iconStyled := lipgloss.NewStyle().
			Foreground(iconColor).
			Bold(true).
			Render(icon)

		// Test name
		nameStyle := lipgloss.NewStyle().
			Width(15).
			Foreground(styles.GrayMedium)
		name := nameStyle.Render(result.TestName)

		// Pass@1
		passColor := styles.OrangeSuccess
		if result.PassAtOne < 0.5 {
			passColor = styles.OrangeError
		} else if result.PassAtOne < 0.7 {
			passColor = styles.OrangeWarning
		}

		pass1 := lipgloss.NewStyle().
			Foreground(passColor).
			Render(fmt.Sprintf("%.2f", result.PassAtOne))

		lines = append(lines, fmt.Sprintf(" %s %s  %s", iconStyled, name, pass1))
	}

	if maxResults < len(m.state.Results) {
		remaining := len(m.state.Results) - maxResults
		lines = append(lines, lipgloss.NewStyle().
			Foreground(styles.GrayDim).
			Render(fmt.Sprintf("  ... and %d more", remaining)))
	}

	lines = append(lines, "", "")

	// Options
	opt1 := "  Run another benchmark"
	opt2 := "  Exit"

	if m.selectedOption == 0 {
		opt1 = lipgloss.NewStyle().
			Foreground(styles.OrangePrimary).
			Bold(true).
			Render("▸ Run another benchmark")
	} else if m.selectedOption == 1 {
		opt2 = lipgloss.NewStyle().
			Foreground(styles.OrangePrimary).
			Bold(true).
			Render("▸ Exit")
	}

	lines = append(lines, opt1, opt2)

	// Help
	lines = append(lines, "")
	help := lipgloss.NewStyle().
		Foreground(styles.GrayDim).
		Render("↑/↓: Navigate • Enter: Select • Q/Ctrl+C: Quit")
	lines = append(lines, help)

	content := lipgloss.NewStyle().
		Padding(2, 2).
		MaxWidth(m.width).
		MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))

	return content
}
