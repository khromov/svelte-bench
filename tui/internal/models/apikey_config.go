package models

import (
	"fmt"
	"strings"
	"svelte-bench/tui/internal/components"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type validationMsg struct {
	provider string
	success  bool
	error    string
}

// APIKeyConfigModel handles API key configuration
type APIKeyConfigModel struct {
	state            *SharedState
	providers        []config.Provider
	selectedIndex    int
	editing          bool
	input            components.MaskedInput
	editingProvider  string
	validating       bool
	validationStart  time.Time
	validationResult string
	saveToFile       bool
	width            int
	height           int
}

// NewAPIKeyConfigModel creates a new API key config model
func NewAPIKeyConfigModel(state *SharedState) APIKeyConfigModel {
	providers := config.AllProviders()

	// Load existing keys
	for i := range providers {
		if key, ok := state.Config.APIKeys[providers[i].EnvKey]; ok {
			providers[i].APIKey = key
		}
	}

	return APIKeyConfigModel{
		state:      state,
		providers:  providers,
		input:      components.NewMaskedInput("Enter API key", 50),
		saveToFile: true,
		width:      80,
		height:     24,
	}
}

func (m APIKeyConfigModel) Init() tea.Cmd {
	return nil
}

func (m APIKeyConfigModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		if m.editing {
			switch msg.String() {
			case "esc":
				m.editing = false
				m.input.Blur()
				return m, nil
			case "enter":
				// Save the key
				key := m.input.Value()
				if key != "" {
					// Start validation
					m.validating = true
					m.validationStart = time.Now()
					return m, m.validateKey(m.editingProvider, key)
				}
				m.editing = false
				m.input.Blur()
				return m, nil
			default:
				var cmd tea.Cmd
				cmd = m.input.Update(msg)
				return m, cmd
			}
		}

		switch msg.String() {
		case "ctrl+c":
			return m, tea.Quit

		case "up":
			if m.selectedIndex > 0 {
				m.selectedIndex--
			}

		case "down":
			if m.selectedIndex < len(m.providers)-1 {
				m.selectedIndex++
			}

		case "enter":
			// Edit selected provider's key
			m.editing = true
			m.editingProvider = m.providers[m.selectedIndex].EnvKey
			m.input.SetValue(m.providers[m.selectedIndex].APIKey)
			m.input.Focus()
			m.validationResult = ""

		case "tab", "right", "l":
			// Continue to next screen if we have at least one key
			if m.state.Config.HasAnyAPIKeys() {
				// Always save to .env file
				m.state.Config.SaveToFile = true
				m.state.Config.SaveToEnv()
				return NewExecutionModeModel(m.state), nil
			}
		}

	case validationMsg:
		m.validating = false
		if msg.success {
			m.validationResult = "✓ Valid"
			// Save the key
			m.providers[m.selectedIndex].APIKey = m.input.Value()
			m.state.Config.APIKeys[msg.provider] = m.input.Value()
			m.editing = false
			m.input.Blur()
		} else {
			m.validationResult = "✗ " + msg.error
		}
		return m, nil
	}

	return m, nil
}

func (m APIKeyConfigModel) View() string {
	// Editing modal
	if m.editing {
		var lines []string
		lines = append(lines, lipgloss.NewStyle().Bold(true).Render("Configure "+m.providers[m.selectedIndex].Name))
		lines = append(lines, "")
		lines = append(lines, m.input.View())
		lines = append(lines, "")

		if m.validating {
			spinner := styles.GetSpinnerFrame(m.validationStart)
			lines = append(lines, styles.ProgressTextStyle.Render(spinner+" Validating..."))
		} else if m.validationResult != "" {
			if strings.HasPrefix(m.validationResult, "✓") {
				lines = append(lines, styles.SuccessStyle.Render(m.validationResult))
			} else {
				lines = append(lines, styles.ErrorStyle.Render(m.validationResult))
			}
		}

		lines = append(lines, "", styles.HelpStyle.Render("Enter: Confirm • Esc: Cancel"))

		modal := lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(styles.OrangePrimary).
			Padding(0, 2).
			Render(lipgloss.JoinVertical(lipgloss.Left, lines...))

		return lipgloss.NewStyle().Padding(2, 4).Render(modal)
	}

	// Provider list
	title := lipgloss.NewStyle().Bold(true).Render(
		styles.CreateGradient("API Configuration", styles.PrimaryGradient),
	)

	var lines []string
	lines = append(lines, title, "")

	// Show all providers
	maxVisible := m.height - 8
	if maxVisible < 5 {
		maxVisible = 5
	}

	startIdx := m.selectedIndex - maxVisible/2
	if startIdx < 0 {
		startIdx = 0
	}
	endIdx := startIdx + maxVisible
	if endIdx > len(m.providers) {
		endIdx = len(m.providers)
		startIdx = endIdx - maxVisible
		if startIdx < 0 {
			startIdx = 0
		}
	}

	for i := startIdx; i < endIdx; i++ {
		provider := m.providers[i]
		selected := i == m.selectedIndex

		var line string
		if provider.APIKey != "" {
			status := styles.SuccessStyle.Render("✓")
			if selected {
				line = styles.ProgressTextStyle.Render("▸ " + provider.Name + " " + status)
			} else {
				line = "  " + provider.Name + " " + status
			}
		} else {
			if selected {
				line = styles.ProgressTextStyle.Render("▸ " + provider.Name)
			} else {
				line = "  " + provider.Name
			}
		}

		lines = append(lines, line)
	}

	if len(m.providers) > maxVisible {
		lines = append(lines, styles.HelpStyle.Render(fmt.Sprintf("  (showing %d of %d providers)", endIdx-startIdx, len(m.providers))))
	}

	// Help
	lines = append(lines, "")
	if m.state.Config.HasAnyAPIKeys() {
		lines = append(lines, styles.HelpStyle.Render("↑↓: Navigate • Enter: Edit • Tab: Continue • Ctrl+C: Quit"))
	} else {
		lines = append(lines, styles.HelpStyle.Render("↑↓: Navigate • Enter: Edit • Ctrl+C: Quit"))
	}

	content := lipgloss.NewStyle().Padding(0, 2).Render(
		lipgloss.JoinVertical(lipgloss.Left, lines...),
	)

	return content
}

func (m APIKeyConfigModel) validateKey(provider, key string) tea.Cmd {
	return func() tea.Msg {
		err := config.ValidateAPIKey(provider, key)
		if err != nil {
			return validationMsg{
				provider: provider,
				success:  false,
				error:    err.Error(),
			}
		}
		return validationMsg{
			provider: provider,
			success:  true,
		}
	}
}
