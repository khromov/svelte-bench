package models

import (
	"fmt"
	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"
	"sync"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type modelsLoadedMsg struct {
	models []bridge.Model
	err    error
}

type providerValidationMsg struct {
	valid  map[string]bool
	errors map[string]string
}

// ProviderModelSelectModel handles provider and model selection
type ProviderModelSelectModel struct {
	state             *SharedState
	providers         []config.Provider
	selectedProvider  int
	step              int // 0 = select provider, 1 = type model
	modelInput        textinput.Model
	models            []bridge.Model
	filteredModels    []bridge.Model
	selectedModel     int
	loadingModels     bool
	loadingStart      time.Time
	error             string
	width             int
	height            int
	scrollOffset      int // For scrolling providers
	modelScrollOffset int // For scrolling models
	exitOnBack        bool
	validating        bool
	validated         map[string]bool
	validationErrors  map[string]string
}

// NewProviderModelSelectModel creates a new provider/model select model
func NewProviderModelSelectModel(state *SharedState) ProviderModelSelectModel {
	providers := state.Config.GetAllProvidersWithKeys()

	modelInput := textinput.New()
	modelInput.Placeholder = "Type model name or use arrows to select..."
	modelInput.Width = 60
	modelInput.PromptStyle = lipgloss.NewStyle().Foreground(styles.OrangePrimary)
	modelInput.TextStyle = lipgloss.NewStyle().Foreground(styles.OrangePrimary)

	return ProviderModelSelectModel{
		state:            state,
		providers:        providers,
		selectedProvider: 0,
		step:             0,
		modelInput:       modelInput,
		width:            80,
		height:           24,
		validated:        make(map[string]bool),
		validationErrors: make(map[string]string),
		validating:       true,
		exitOnBack:       true,
	}
}

func NewProviderModelSelectFromConfig(cfg *config.Config) ProviderModelSelectModel {
	return NewProviderModelSelectModel(&SharedState{Config: cfg})
}

func NewProviderModelSelectFromExecution(state *SharedState) ProviderModelSelectModel {
	m := NewProviderModelSelectModel(state)
	m.exitOnBack = false
	for i, provider := range m.providers {
		if provider.EnvKey == state.ProviderKey {
			m.selectedProvider = i
			break
		}
	}
	return m
}

// NewModelSelectionModel creates the model-selection step for the chosen provider.
func NewModelSelectionModel(state *SharedState) ProviderModelSelectModel {
	m := NewProviderModelSelectFromExecution(state)
	m.step = 1
	for i, provider := range m.providers {
		if provider.EnvKey == state.ProviderKey {
			m.selectedProvider = i
			break
		}
	}
	m.modelInput.Focus()
	return m
}

func (m ProviderModelSelectModel) Init() tea.Cmd {
	if m.step == 0 {
		return m.validateConfiguredProviders()
	}
	return nil
}

func (m ProviderModelSelectModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		if m.width < 80 {
			m.modelInput.Width = m.width - 20
		} else {
			m.modelInput.Width = 60
		}
		return m, nil

	case tea.KeyMsg:
		// Step 0: Select provider
		if m.step == 0 {
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
				if m.selectedProvider > 0 {
					m.selectedProvider--
					// Adjust scroll
					maxVisible := m.height - 8
					if maxVisible < 5 {
						maxVisible = 5
					}
					if m.selectedProvider < m.scrollOffset {
						m.scrollOffset = m.selectedProvider
					}
				}
			case "down":
				if m.selectedProvider < len(m.providers)-1 {
					m.selectedProvider++
					// Adjust scroll
					maxVisible := m.height - 8
					if maxVisible < 5 {
						maxVisible = 5
					}
					if m.selectedProvider >= m.scrollOffset+maxVisible {
						m.scrollOffset = m.selectedProvider - maxVisible + 1
					}
				}
			case "enter":
				provider := m.providers[m.selectedProvider]
				m.state.Provider = bridge.ConvertProviderNameToEnvKey(provider.Name)
				m.state.ProviderKey = provider.EnvKey
				if provider.APIKey == "" || m.validationErrors[provider.EnvKey] != "" {
					return NewAPIKeyPromptModel(m.state, provider), nil
				}
				if m.validating && config.SupportsAPIKeyValidation(provider.EnvKey) && !m.validated[provider.EnvKey] {
					return m, nil
				}
				// Keep the flow consistent whether the key was already configured or
				// entered moments ago: choose execution mode before loading models.
				return NewExecutionModeModel(m.state), nil
			}
		} else {
			// Step 1: Type model name with autocomplete
			switch msg.String() {
			case "esc":
				if DoubleEscapeRequestsExit() {
					return m, tea.Quit
				}
			case "left":
				// Go back to provider selection
				m.step = 0
				m.modelInput.Blur()
				m.modelInput.SetValue("")
				m.filteredModels = nil
				m.modelScrollOffset = 0
				return m, nil
			case "enter":
				if len(m.filteredModels) > 0 && m.selectedModel < len(m.filteredModels) {
					// Select model
					m.state.Provider = bridge.ConvertProviderNameToEnvKey(m.providers[m.selectedProvider].Name)
					m.state.ProviderKey = m.providers[m.selectedProvider].EnvKey
					m.state.Model = m.filteredModels[m.selectedModel].ID

					model := NewBenchmarkModel(m.state)
					return model, model.Init()
				} else if m.modelInput.Value() != "" {
					// User typed a custom model name
					m.state.Provider = bridge.ConvertProviderNameToEnvKey(m.providers[m.selectedProvider].Name)
					m.state.ProviderKey = m.providers[m.selectedProvider].EnvKey
					m.state.Model = m.modelInput.Value()

					model := NewBenchmarkModel(m.state)
					return model, model.Init()
				}
			case "up":
				if m.selectedModel > 0 {
					m.selectedModel--
					// Adjust scroll
					maxVisible := m.height - 12
					if maxVisible < 3 {
						maxVisible = 3
					}
					if m.selectedModel < m.modelScrollOffset {
						m.modelScrollOffset = m.selectedModel
					}
				}
			case "down":
				if len(m.filteredModels) > 0 && m.selectedModel < len(m.filteredModels)-1 {
					m.selectedModel++
					// Adjust scroll
					maxVisible := m.height - 12
					if maxVisible < 3 {
						maxVisible = 3
					}
					if m.selectedModel >= m.modelScrollOffset+maxVisible {
						m.modelScrollOffset = m.selectedModel - maxVisible + 1
					}
				}
			default:
				// Update input and filter suggestions
				var cmd tea.Cmd
				m.modelInput, cmd = m.modelInput.Update(msg)

				query := m.modelInput.Value()
				if query == "" {
					m.filteredModels = m.models
				} else {
					m.filteredModels = bridge.FuzzySearch(m.models, query)
				}
				m.selectedModel = 0
				m.modelScrollOffset = 0

				return m, cmd
			}
		}

	case modelsLoadedMsg:
		m.loadingModels = false
		if msg.err != nil {
			m.error = msg.err.Error()
		} else {
			m.models = msg.models
			m.filteredModels = msg.models
			m.selectedModel = 0
			m.error = ""
		}
		return m, nil

	case providerValidationMsg:
		m.validating = false
		m.validated = msg.valid
		m.validationErrors = msg.errors
		return m, nil
	}

	return m, nil
}

func (m ProviderModelSelectModel) View() string {
	var lines []string

	// Header
	if m.step == 0 {
		title := styles.HeadingStyle.Render("📡 SELECT PROVIDER")
		lines = append(lines, title, "")
	} else {
		title := styles.HeadingStyle.Render("🤖 SELECT MODEL")
		lines = append(lines, title, "")
	}

	if m.step == 0 {
		// Provider list with scrolling
		maxVisible := m.height - 8
		if maxVisible < 5 {
			maxVisible = 5
		}

		// Calculate scrollable window
		startIdx := m.scrollOffset
		endIdx := startIdx + maxVisible
		if endIdx > len(m.providers) {
			endIdx = len(m.providers)
		}

		for i := startIdx; i < endIdx; i++ {
			provider := m.providers[i]
			status := ""
			if m.validated[provider.EnvKey] {
				status = " ✓"
			} else if m.validationErrors[provider.EnvKey] != "" {
				status = " !"
			} else if provider.APIKey != "" && m.validating {
				status = " …"
			} else if provider.APIKey != "" {
				// Some providers do not expose a lightweight validation endpoint.
				// Still show that their key was loaded from configuration.
				status = " • Stored"
			}
			if i == m.selectedProvider {
				lines = append(lines, lipgloss.NewStyle().
					Foreground(styles.OrangePrimary).
					Bold(true).
					Render("▸ "+provider.Name+status))
			} else {
				lines = append(lines, "  "+provider.Name+status)
			}
		}

		// Show scroll indicator
		if len(m.providers) > maxVisible {
			lines = append(lines, "")
			lines = append(lines, lipgloss.NewStyle().
				Foreground(styles.GrayDim).
				Render(fmt.Sprintf("(%d/%d)", m.selectedProvider+1, len(m.providers))))
		}

		lines = append(lines, "")
		lines = append(lines, lipgloss.NewStyle().
			Foreground(styles.GrayDim).
			Render("↑/↓: Navigate • Enter: Select • ✓ Valid • Stored • ! Invalid • ←: Back • Double Esc: Quit • Ctrl+C: Quit"))
	} else {
		// Model input with autocomplete
		providerName := m.providers[m.selectedProvider].Name
		lines = append(lines, lipgloss.NewStyle().
			Foreground(styles.OrangeMid).
			Render("Provider: "+providerName))
		lines = append(lines, "")

		// Input box
		inputLabel := lipgloss.NewStyle().
			Foreground(styles.OrangeLight).
			Render("Model: ")
		lines = append(lines, inputLabel+m.modelInput.View())
		lines = append(lines, "")

		// Suggestions
		if m.loadingModels {
			spinner := styles.SpinnerFrames[int(time.Since(m.loadingStart).Milliseconds()/100)%len(styles.SpinnerFrames)]
			lines = append(lines, lipgloss.NewStyle().
				Foreground(styles.OrangePrimary).
				Render(spinner+" Loading models..."))
		} else if m.error != "" {
			lines = append(lines, styles.ErrorStyle.Render("Error: "+m.error))
		} else if len(m.filteredModels) > 0 {
			suggestionsLabel := lipgloss.NewStyle().
				Foreground(styles.OrangeMid).
				Render("Suggestions:")
			lines = append(lines, suggestionsLabel)

			maxSuggestions := m.height - 12
			if maxSuggestions < 3 {
				maxSuggestions = 3
			}

			// Calculate scrollable window
			startIdx := m.modelScrollOffset
			endIdx := startIdx + maxSuggestions
			if endIdx > len(m.filteredModels) {
				endIdx = len(m.filteredModels)
			}

			for i := startIdx; i < endIdx; i++ {
				model := m.filteredModels[i]
				if i == m.selectedModel {
					lines = append(lines, lipgloss.NewStyle().
						Foreground(styles.OrangePrimary).
						Bold(true).
						Render("▸ "+model.ID))
				} else {
					lines = append(lines, "  "+model.ID)
				}
			}

			if len(m.filteredModels) > endIdx {
				lines = append(lines, lipgloss.NewStyle().
					Foreground(styles.GrayDim).
					Render(fmt.Sprintf("... %d more", len(m.filteredModels)-endIdx)))
			}

			if len(m.filteredModels) > maxSuggestions {
				lines = append(lines, "")
				lines = append(lines, lipgloss.NewStyle().
					Foreground(styles.GrayDim).
					Render(fmt.Sprintf("(%d/%d)", m.selectedModel+1, len(m.filteredModels))))
			}
		}

		lines = append(lines, "")
		lines = append(lines, lipgloss.NewStyle().
			Foreground(styles.GrayDim).
			Render("Type to search • ↑/↓: Navigate • Enter: Select • ←: Back • Double Esc: Quit • Ctrl+C: Quit"))
	}

	content := lipgloss.NewStyle().
		Padding(2, 2).
		MaxWidth(m.width).
		MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))

	return content
}

func (m ProviderModelSelectModel) loadModels(provider config.Provider) tea.Cmd {
	m.loadingModels = true
	m.loadingStart = time.Now()

	return func() tea.Msg {
		models, err := bridge.FetchModels(provider.EnvKey, provider.APIKey)
		return modelsLoadedMsg{models: models, err: err}
	}
}

func (m ProviderModelSelectModel) validateConfiguredProviders() tea.Cmd {
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
