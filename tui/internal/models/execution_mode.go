package models

import (
	"svelte-bench/tui/internal/styles"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// ExecutionModeModel handles execution mode selection
type ExecutionModeModel struct {
	state          *SharedState
	selectedOption int
	width          int
	height         int
}

// NewExecutionModeModel creates a new execution mode model
func NewExecutionModeModel(state *SharedState) ExecutionModeModel {
	return ExecutionModeModel{
		state:          state,
		selectedOption: 0, // Default to parallel
		width:          80,
		height:         24,
	}
}

func (m ExecutionModeModel) Init() tea.Cmd {
	return nil
}

func (m ExecutionModeModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c":
			return m, tea.Quit

		case "up":
			m.selectedOption = (m.selectedOption - 1 + 2) % 2

		case "down":
			m.selectedOption = (m.selectedOption + 1) % 2

		case "enter":
			m.state.Parallel = (m.selectedOption == 0)
			return NewProviderModelSelectModel(m.state), nil
		}
	}

	return m, nil
}

func (m ExecutionModeModel) View() string {
	var lines []string

	// Title
	title := lipgloss.NewStyle().
		Bold(true).
		Foreground(styles.OrangePrimary).
		Render("⚡ Select Execution Mode")

	lines = append(lines, title, "", "")

	// Parallel option
	opt1 := "  Parallel (faster, concurrent samples)"
	if m.selectedOption == 0 {
		opt1 = lipgloss.NewStyle().
			Foreground(styles.OrangePrimary).
			Bold(true).
			Render("▸ Parallel (faster, concurrent samples)")
	}

	// Sequential option
	opt2 := "  Sequential (reliable, one at a time)"
	if m.selectedOption == 1 {
		opt2 = lipgloss.NewStyle().
			Foreground(styles.OrangePrimary).
			Bold(true).
			Render("▸ Sequential (reliable, one at a time)")
	}

	lines = append(lines, opt1, opt2)

	// Help text
	lines = append(lines, "")
	help := lipgloss.NewStyle().
		Foreground(styles.GrayDim).
		Render("↑/↓: Navigate • Enter: Select • Ctrl+C: Quit")
	lines = append(lines, help)

	content := lipgloss.NewStyle().
		Padding(2, 2).
		MaxWidth(m.width).
		MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))

	return content
}
