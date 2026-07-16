package models

import (
	"strings"
	"svelte-bench/tui/internal/components"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// APIKeyPromptModel asks for a key only when the selected provider has none.
type APIKeyPromptModel struct {
	state    *SharedState
	provider config.Provider
	input    components.MaskedInput
	error    string
	width    int
	height   int
}

func NewAPIKeyPromptModel(state *SharedState, provider config.Provider) APIKeyPromptModel {
	input := components.NewMaskedInput("Enter API key", 60)
	input.Focus()
	return APIKeyPromptModel{
		state:    state,
		provider: provider,
		input:    input,
		width:    80,
		height:   24,
	}
}

func (m APIKeyPromptModel) Init() tea.Cmd { return nil }

func (m APIKeyPromptModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
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
			m.input.Blur()
			return NewProviderModelSelectModel(m.state), nil
		case "left":
			m.input.Blur()
			return NewProviderModelSelectModel(m.state), nil
		case "enter":
			key := strings.TrimSpace(m.input.Value())
			if key == "" {
				m.error = "API key cannot be empty"
				return m, nil
			}
			m.state.Config.APIKeys[m.provider.EnvKey] = key
			if err := m.state.Config.SaveToEnv(); err != nil {
				m.error = "Could not save API key: " + err.Error()
				return m, nil
			}
			return NewExecutionModeModel(m.state), nil
		default:
			return m, m.input.Update(msg)
		}
	}

	return m, nil
}

func (m APIKeyPromptModel) View() string {
	title := styles.HeadingStyle.Render("🔑 API KEY REQUIRED")
	subtitle := lipgloss.NewStyle().Foreground(styles.OrangeMid).Render(m.provider.Name)
	lines := []string{title, subtitle, "", m.input.View()}
	if m.error != "" {
		lines = append(lines, "", styles.ErrorStyle.Render(m.error))
	}
	lines = append(lines, "", styles.HelpStyle.Render("Enter: Save • ←: Back • Double Esc: Quit • Ctrl+C: Quit"))

	return lipgloss.NewStyle().
		Padding(2, 4).
		MaxWidth(m.width).
		MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))
}
