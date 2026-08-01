package models

import (
	"fmt"
	"strings"
	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"
	"sync"
	"time"

	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
)

type modelsLoadedMsg struct {
	models []bridge.Model
	err    error
}

type providerValidationMsg struct {
	valid  map[string]bool
	errors map[string]string
}

const wrapNavigationLimit = 25

// ProviderModelSelectModel handles provider and model selection
type ProviderModelSelectModel struct {
	state             *SharedState
	providers         []config.Provider
	selectedProvider  int
	step              int // 0 = select provider, 1 = select one or more models
	modelInput        textinput.Model
	models            []bridge.Model
	filteredModels    []bridge.Model
	selectedModel     int
	selectedModels    map[string]bool
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
	if state.ValidatedProviders == nil {
		state.ValidatedProviders = make(map[string]bool)
	}
	if state.ProviderValidationErrors == nil {
		state.ProviderValidationErrors = make(map[string]string)
	}

	modelInput := textinput.New()
	modelInput.Placeholder = "Search model IDs..."
	modelInput.SetWidth(60)
	modelInputStyles := modelInput.Styles()
	modelInputStyles.Focused.Prompt = lipgloss.NewStyle().Foreground(styles.OrangePrimary)
	modelInputStyles.Focused.Text = lipgloss.NewStyle().Foreground(styles.OrangePrimary)
	modelInputStyles.Blurred = modelInputStyles.Focused
	modelInput.SetStyles(modelInputStyles)

	return ProviderModelSelectModel{
		state:            state,
		providers:        providers,
		selectedProvider: 0,
		step:             0,
		modelInput:       modelInput,
		selectedModels:   make(map[string]bool),
		width:            80,
		height:           24,
		validated:        state.ValidatedProviders,
		validationErrors: state.ProviderValidationErrors,
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
			m.modelInput.SetWidth(max(12, m.width-20))
		} else {
			m.modelInput.SetWidth(60)
		}
		return m, nil

	case tea.KeyPressMsg:
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
				if m.selectedProvider == 0 && len(m.providers) > 0 && len(m.providers) < wrapNavigationLimit {
					m.selectedProvider = len(m.providers) - 1
					maxVisible := max(5, m.height-8)
					m.scrollOffset = max(0, len(m.providers)-maxVisible)
				} else if m.selectedProvider > 0 {
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
				if m.selectedProvider == len(m.providers)-1 && len(m.providers) < wrapNavigationLimit {
					m.selectedProvider = 0
					m.scrollOffset = 0
				} else if m.selectedProvider < len(m.providers)-1 {
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
			case "space":
				if len(m.filteredModels) > 0 && m.selectedModel < len(m.filteredModels) {
					id := m.filteredModels[m.selectedModel].ID
					m.selectedModels[id] = !m.selectedModels[id]
					if !m.selectedModels[id] {
						delete(m.selectedModels, id)
					}
					m.error = ""
				}
			case "enter":
				selected := m.selectedModelIDs()
				if len(selected) == 0 && len(m.filteredModels) > 0 && m.selectedModel < len(m.filteredModels) {
					selected = []string{m.filteredModels[m.selectedModel].ID}
				} else if len(selected) == 0 {
					customModel := strings.TrimSpace(m.modelInput.Value())
					if customModel != "" {
						selected = []string{customModel}
					}
				}

				if len(selected) == 0 {
					m.error = "Select at least one model"
					return m, nil
				}
				return m.startBenchmark(selected)
			case "up":
				if m.selectedModel == 0 && len(m.filteredModels) > 0 && len(m.filteredModels) < wrapNavigationLimit {
					m.selectedModel = len(m.filteredModels) - 1
					maxVisible := max(3, m.height-12)
					m.modelScrollOffset = max(0, len(m.filteredModels)-maxVisible)
				} else if m.selectedModel > 0 {
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
				if len(m.filteredModels) > 0 && m.selectedModel == len(m.filteredModels)-1 && len(m.filteredModels) < wrapNavigationLimit {
					m.selectedModel = 0
					m.modelScrollOffset = 0
				} else if len(m.filteredModels) > 0 && m.selectedModel < len(m.filteredModels)-1 {
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
			if m.selectedModels == nil {
				m.selectedModels = make(map[string]bool)
			}
			m.selectedModel = 0
			m.error = ""
		}
		return m, nil

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

func (m ProviderModelSelectModel) View() tea.View {
	var lines []string

	// Header
	if m.step == 0 {
		title := styles.HeadingStyle.Render("SELECT PROVIDER")
		lines = append(lines, styles.SectionLabelStyle.Render("01 / PROVIDER"), title, "")
	} else {
		title := styles.HeadingStyle.Render("SELECT MODELS")
		lines = append(lines, styles.SectionLabelStyle.Render("03 / MODELS"), title, "")
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
				status = " •"
			}
			if i == m.selectedProvider {
				lines = append(lines, lipgloss.NewStyle().
					Foreground(styles.OrangePrimary).
					Bold(true).
					Render("> "+provider.Name+status))
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
			Render("Up/Down: Navigate • Enter: Select • ✓ Valid • Stored • ! Invalid • Left: Back • Double Esc: Quit • Ctrl+C: Quit"))
	} else {
		// Searchable, multi-select model catalog.
		providerName := m.providers[m.selectedProvider].Name
		providerLine := lipgloss.NewStyle().Foreground(styles.GrayMedium).Render("PROVIDER  ") +
			lipgloss.NewStyle().Foreground(styles.OrangeMid).Bold(true).Render(providerName)
		lines = append(lines, providerLine)
		lines = append(lines, "")

		// Input box
		inputLabel := lipgloss.NewStyle().
			Foreground(styles.GrayMedium).
			Render("FILTER  ")
		lines = append(lines, inputLabel+m.modelInput.View())
		selectedCount := len(m.selectedModels)
		selectionStatus := "No models marked — Enter runs the focused model"
		if selectedCount == 1 {
			selectionStatus = "1 model marked for this run"
		} else if selectedCount > 1 {
			selectionStatus = fmt.Sprintf("%d models marked for this run", selectedCount)
		}
		lines = append(lines, lipgloss.NewStyle().Foreground(styles.GrayDim).Render(selectionStatus), "")

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
				Bold(true).
				Render("MODEL CATALOG")
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
				lines = append(lines, m.renderModelRow(model, i == m.selectedModel))
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

		if !m.loadingModels && m.error == "" && len(m.filteredModels) == 0 && strings.TrimSpace(m.modelInput.Value()) != "" {
			lines = append(lines, lipgloss.NewStyle().Foreground(styles.GrayMedium).
				Render("No catalog match — Enter runs this custom model ID"))
		}

		lines = append(lines, "")
		lines = append(lines, lipgloss.NewStyle().
			Foreground(styles.GrayDim).
			Render("Type: Filter • ↑/↓: Focus • Space: Mark • Enter: Run marked/focused • ←: Back • Ctrl+C: Quit"))
	}

	content := lipgloss.NewStyle().
		Padding(2, 2).
		MaxWidth(m.width).
		MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))

	return newView(content)
}

func (m ProviderModelSelectModel) selectedModelIDs() []string {
	selected := make([]string, 0, len(m.selectedModels))
	for _, model := range m.models {
		if m.selectedModels[model.ID] {
			selected = append(selected, model.ID)
		}
	}
	return selected
}

func (m ProviderModelSelectModel) startBenchmark(modelIDs []string) (tea.Model, tea.Cmd) {
	m.state.Provider = bridge.ConvertProviderNameToEnvKey(m.providers[m.selectedProvider].Name)
	m.state.ProviderKey = m.providers[m.selectedProvider].EnvKey
	m.state.Model = strings.Join(modelIDs, ",")

	model := NewBenchmarkModel(m.state)
	return model, model.Init()
}

func (m ProviderModelSelectModel) renderModelRow(model bridge.Model, focused bool) string {
	rowWidth := m.width - 8
	if rowWidth < 36 {
		rowWidth = 36
	}
	if rowWidth > 96 {
		rowWidth = 96
	}

	marker := "[ ]"
	markerColor := styles.GrayDim
	if m.selectedModels[model.ID] {
		marker = "[x]"
		markerColor = styles.OrangePrimary
	}

	date := ""
	if !model.AddedAt.IsZero() {
		date = "Added " + model.AddedAt.Format("2006-01-02")
	}
	labelWidth := rowWidth - 7
	if date != "" {
		labelWidth -= len(date) + 1
	}
	if labelWidth < 8 {
		labelWidth = 8
	}
	label := truncateText(model.ID, labelWidth)
	label = lipgloss.NewStyle().Width(labelWidth).Render(label)

	prefix := "  "
	foreground := styles.GrayLight
	rowStyle := lipgloss.NewStyle().Width(rowWidth).Foreground(foreground)
	if focused {
		prefix = "> "
		rowStyle = styles.SelectedRowStyle.Width(rowWidth)
	}

	content := prefix + lipgloss.NewStyle().Foreground(markerColor).Bold(true).Render(marker) + " " + label
	if date != "" {
		content += " " + lipgloss.NewStyle().Foreground(styles.GrayDim).Render(date)
	}
	return rowStyle.Render(content)
}

func truncateText(value string, width int) string {
	runes := []rune(value)
	if len(runes) <= width {
		return value
	}
	if width <= 1 {
		return string(runes[:width])
	}
	return string(runes[:width-1]) + "…"
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
