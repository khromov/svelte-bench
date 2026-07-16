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
		case "esc":
			if DoubleEscapeRequestsExit() {
				return m, tea.Quit
			}
		case "left":
			model := NewProviderModelSelectFromExecution(m.state)
			return model, model.Init()

		case "up":
			m.selectedOption = (m.selectedOption - 1 + 3) % 3

		case "down":
			m.selectedOption = (m.selectedOption + 1) % 3

		case "enter":
			m.state.Parallel = (m.selectedOption == 0)
			m.state.Madmax = (m.selectedOption == 2)
			model := NewModelSelectionModel(m.state)
			return model, model.loadModels(model.providers[model.selectedProvider])
		}
	}

	return m, nil
}

func (m ExecutionModeModel) View() string {
	var lines []string

	// Title
	title := styles.HeadingStyle.Render("EXECUTION MODE")

	lines = append(lines, title, "", "")

	// Parallel option
	opt1 := "  Parallel (faster, concurrent samples)"
	if m.selectedOption == 0 {
		opt1 = lipgloss.NewStyle().
			Foreground(styles.OrangePrimary).
			Bold(true).
			Render("> Parallel (faster, concurrent samples)")
	}

	// Sequential option
	opt2 := "  Sequential (reliable, one at a time)"
	if m.selectedOption == 1 {
		opt2 = lipgloss.NewStyle().
			Foreground(styles.OrangePrimary).
			Bold(true).
			Render("> Sequential (reliable, one at a time)")
	}

	// MADMAX option
	opt3 := "  MADMAX (all categories and samples concurrent)"
	if m.selectedOption == 2 {
		opt3 = lipgloss.NewStyle().
			Foreground(styles.OrangePrimary).
			Bold(true).
			Render("> MADMAX (all categories and samples concurrent)")
	}

	lines = append(lines, opt1, opt2, opt3)

	// Help text
	lines = append(lines, "")
	help := lipgloss.NewStyle().
		Foreground(styles.GrayDim).
		Render("Up/Down: Navigate • Enter: Select • Left: Back • Double Esc: Quit • Ctrl+C: Quit")
	lines = append(lines, help)

	content := lipgloss.NewStyle().
		Padding(2, 2).
		MaxWidth(m.width).
		MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))

	return content
}
