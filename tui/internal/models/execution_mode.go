package models

import (
	"fmt"
	"svelte-bench/tui/internal/styles"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
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

	case tea.KeyPressMsg:
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
			model, cmd := model.loadModels(model.providers[model.selectedProvider])
			return model, cmd
		}
	}

	return m, nil
}

func (m ExecutionModeModel) View() tea.View {
	var lines []string

	title := styles.HeadingStyle.Render("EXECUTION MODE")
	lines = append(lines, styles.SectionLabelStyle.Render("02 / EXECUTION"), title, "")

	options := []struct {
		name        string
		description string
	}{
		{"Parallel", "Models and samples run concurrently"},
		{"Sequential", "One model and sample at a time"},
		{"MADMAX", "Every model, category, and sample concurrent"},
	}
	for i, option := range options {
		lines = append(lines, m.renderModeOption(i, option.name, option.description))
	}

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

	return newView(content)
}

func (m ExecutionModeModel) renderModeOption(index int, name, description string) string {
	width := m.width - 8
	if width < 44 {
		width = 44
	}
	if width > 76 {
		width = 76
	}

	prefix := "  "
	style := lipgloss.NewStyle().Width(width).Foreground(styles.GrayLight)
	if index == m.selectedOption {
		prefix = "> "
		style = styles.SelectedRowStyle.Width(width)
	}

	nameColumn := lipgloss.NewStyle().Width(14).Bold(true).Render(fmt.Sprintf("%d  %s", index+1, name))
	detail := lipgloss.NewStyle().Foreground(styles.GrayMedium).Render(description)
	return style.Render(prefix + nameColumn + detail)
}
