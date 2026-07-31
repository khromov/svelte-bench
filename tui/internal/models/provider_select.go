package models

import (
	"fmt"
	"sync"

	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
)

type providerValidationMsg struct {
	valid  map[string]bool
	errors map[string]string
}

// ProviderSelectModel handles provider selection and credential validation.
type ProviderSelectModel struct {
	state            *SharedState
	providers        []config.Provider
	selectedProvider int
	scrollOffset     int
	exitOnBack       bool
	validating       bool
	validated        map[string]bool
	validationErrors map[string]string
	width            int
	height           int
}

func NewProviderSelectModel(state *SharedState) ProviderSelectModel {
	if state.ValidatedProviders == nil {
		state.ValidatedProviders = make(map[string]bool)
	}
	if state.ProviderValidationErrors == nil {
		state.ProviderValidationErrors = make(map[string]string)
	}
	return ProviderSelectModel{
		state:            state,
		providers:        state.Config.GetAllProvidersWithKeys(),
		exitOnBack:       true,
		validating:       true,
		validated:        state.ValidatedProviders,
		validationErrors: state.ProviderValidationErrors,
		width:            80,
		height:           24,
	}
}

func NewProviderSelectFromConfig(cfg *config.Config) ProviderSelectModel {
	return NewProviderSelectModel(&SharedState{Config: cfg})
}

func NewProviderSelectFromExecution(state *SharedState) ProviderSelectModel {
	m := NewProviderSelectModel(state)
	m.exitOnBack = false
	m.selectCurrentProvider()
	return m
}

func (m *ProviderSelectModel) selectCurrentProvider() {
	for i, provider := range m.providers {
		if provider.EnvKey == m.state.ProviderKey {
			m.selectedProvider = i
			return
		}
	}
}

func (m ProviderSelectModel) Init() tea.Cmd { return m.validateConfiguredProviders() }

func (m ProviderSelectModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
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
			if m.exitOnBack {
				return m, tea.Quit
			}
			return NewExecutionModeModel(m.state), nil
		case "up":
			m.selectedProvider, m.scrollOffset = moveListSelection(
				m.selectedProvider, len(m.providers), -1, m.scrollOffset, m.maxVisible(),
			)
		case "down":
			m.selectedProvider, m.scrollOffset = moveListSelection(
				m.selectedProvider, len(m.providers), 1, m.scrollOffset, m.maxVisible(),
			)
		case "enter":
			if len(m.providers) == 0 {
				return m, nil
			}
			provider := m.providers[m.selectedProvider]
			m.state.Provider = bridge.ConvertProviderNameToEnvKey(provider.Name)
			m.state.ProviderKey = provider.EnvKey
			if provider.APIKey == "" || m.validationErrors[provider.EnvKey] != "" {
				return NewAPIKeyPromptModel(m.state, provider), nil
			}
			if m.validating && config.SupportsAPIKeyValidation(provider.EnvKey) && !m.validated[provider.EnvKey] {
				return m, nil
			}
			return NewExecutionModeModel(m.state), nil
		}
	case providerValidationMsg:
		m.validating = false
		m.validated = msg.valid
		m.validationErrors = msg.errors
		m.state.ValidatedProviders = msg.valid
		m.state.ProviderValidationErrors = msg.errors
		return m, nil
	}
	return m, nil
}

func (m ProviderSelectModel) View() tea.View {
	lines := []string{
		styles.SectionLabelStyle.Render("01 / PROVIDER"),
		styles.HeadingStyle.Render("SELECT PROVIDER"),
		"",
	}
	maxVisible := m.maxVisible()
	endIdx := min(m.scrollOffset+maxVisible, len(m.providers))
	for i := m.scrollOffset; i < endIdx; i++ {
		provider := m.providers[i]
		status := m.providerStatus(provider)
		if i == m.selectedProvider {
			lines = append(lines, lipgloss.NewStyle().
				Foreground(styles.OrangePrimary).Bold(true).Render("> "+provider.Name+status))
		} else {
			lines = append(lines, "  "+provider.Name+status)
		}
	}
	if len(m.providers) > maxVisible {
		lines = append(lines, "", lipgloss.NewStyle().Foreground(styles.GrayDim).
			Render(fmt.Sprintf("(%d/%d)", m.selectedProvider+1, len(m.providers))))
	}
	lines = append(lines, "", lipgloss.NewStyle().Foreground(styles.GrayDim).
		Render("Up/Down: Navigate • Enter: Select • ✓ Valid • Stored • ! Invalid • Left: Back • Double Esc: Quit • Ctrl+C: Quit"))
	content := lipgloss.NewStyle().Padding(2, 2).MaxWidth(m.width).MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))
	return newView(content)
}

func (m ProviderSelectModel) maxVisible() int { return max(5, m.height-8) }

func (m ProviderSelectModel) providerStatus(provider config.Provider) string {
	if m.validated[provider.EnvKey] {
		return " ✓"
	}
	if m.validationErrors[provider.EnvKey] != "" {
		return " !"
	}
	if provider.APIKey != "" && m.validating {
		return " …"
	}
	if provider.APIKey != "" {
		return " •"
	}
	return ""
}

func (m ProviderSelectModel) validateConfiguredProviders() tea.Cmd {
	return func() tea.Msg {
		valid := make(map[string]bool)
		errors := make(map[string]string)
		type result struct {
			key string
			err error
		}
		results := make(chan result, len(m.providers))
		var wg sync.WaitGroup
		for _, provider := range m.providers {
			if provider.APIKey == "" || !config.SupportsAPIKeyValidation(provider.EnvKey) {
				continue
			}
			wg.Add(1)
			go func(provider config.Provider) {
				defer wg.Done()
				results <- result{key: provider.EnvKey, err: config.ValidateAPIKey(provider.EnvKey, provider.APIKey)}
			}(provider)
		}
		wg.Wait()
		close(results)
		for result := range results {
			if result.err != nil {
				errors[result.key] = result.err.Error()
			} else {
				valid[result.key] = true
			}
		}
		return providerValidationMsg{valid: valid, errors: errors}
	}
}
