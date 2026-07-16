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
	state      *SharedState
	provider   config.Provider
	input      components.MaskedInput
	error      string
	validating bool
	width      int
	height     int
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
			model := NewProviderModelSelectModel(m.state)
			return model, model.Init()
		case "left":
			m.input.Blur()
			model := NewProviderModelSelectModel(m.state)
			return model, model.Init()
		case "enter":
			if m.validating {
				return m, nil
			}
			key := strings.TrimSpace(m.input.Value())
			if key == "" {
				m.error = "API key cannot be empty"
				return m, nil
			}
			if config.SupportsAPIKeyValidation(m.provider.EnvKey) {
				m.validating = true
				m.error = ""
				return m, m.validateKey(key)
			}
			return m.saveKey(key)
		default:
			if m.validating {
				return m, nil
			}
			return m, m.input.Update(msg)
		}
	case apiKeyValidatedMsg:
		m.validating = false
		if msg.err != nil {
			m.error = "API key validation failed: " + msg.err.Error()
			return m, nil
		}
		return m.saveKey(msg.key)

	}

	return m, nil
}

func (m APIKeyPromptModel) View() string {
	title := styles.HeadingStyle.Render("🔑 API KEY REQUIRED")
	subtitle := lipgloss.NewStyle().Foreground(styles.OrangeMid).Render(m.provider.Name)
	lines := []string{title, subtitle, "", m.input.View()}
	if m.validating {
		lines = append(lines, "", styles.ProgressTextStyle.Render("Validating API key..."))
	}
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

type apiKeyValidatedMsg struct {
	key string
	err error
}

func (m APIKeyPromptModel) validateKey(key string) tea.Cmd {
	return func() tea.Msg {
		return apiKeyValidatedMsg{key: key, err: config.ValidateAPIKey(m.provider.EnvKey, key)}
	}
}

func (m APIKeyPromptModel) saveKey(key string) (tea.Model, tea.Cmd) {
	m.state.Config.APIKeys[m.provider.EnvKey] = key
	if err := m.state.Config.SaveToEnv(); err != nil {
		m.error = "Could not save API key: " + err.Error()
		return m, nil
	}
	return NewExecutionModeModel(m.state), nil
}
