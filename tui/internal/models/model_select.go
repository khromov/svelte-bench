package models

import (
	"fmt"
	"strings"

	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"

	"charm.land/bubbles/v2/spinner"
	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
)

type modelsLoadedMsg struct {
	models []bridge.Model
	err    error
}

// ModelSelectModel handles catalog loading, filtering, and multi-selection.
type ModelSelectModel struct {
	state          *SharedState
	provider       config.Provider
	modelInput     textinput.Model
	models         []bridge.Model
	filteredModels []bridge.Model
	selectedModel  int
	selectedModels map[string]bool
	loadingModels  bool
	loadingSpinner spinner.Model
	modelLoadError string
	error          string
	scrollOffset   int
	width          int
	height         int
}

func NewModelSelectModel(state *SharedState) ModelSelectModel {
	modelInput := textinput.New()
	modelInput.Placeholder = "Search model IDs..."
	modelInput.SetWidth(60)
	inputStyles := modelInput.Styles()
	inputStyles.Focused.Prompt = lipgloss.NewStyle().Foreground(styles.OrangePrimary)
	inputStyles.Focused.Text = lipgloss.NewStyle().Foreground(styles.OrangePrimary)
	inputStyles.Blurred = inputStyles.Focused
	modelInput.SetStyles(inputStyles)
	modelInput.Focus()

	m := ModelSelectModel{
		state:          state,
		modelInput:     modelInput,
		selectedModels: make(map[string]bool),
		loadingSpinner: spinner.New(
			spinner.WithSpinner(spinner.MiniDot),
			spinner.WithStyle(lipgloss.NewStyle().Foreground(styles.OrangePrimary)),
		),
		width:  80,
		height: 24,
	}
	providers := state.Config.GetAllProvidersWithKeys()
	if len(providers) > 0 {
		m.provider = providers[0]
	}
	for _, provider := range providers {
		if provider.EnvKey == state.ProviderKey {
			m.provider = provider
			break
		}
	}
	return m
}

func (m ModelSelectModel) Init() tea.Cmd { return nil }

func (m ModelSelectModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.modelInput.SetWidth(60)
		if m.width < 80 {
			m.modelInput.SetWidth(max(12, m.width-20))
		}
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
			m.modelInput.Blur()
			return NewProviderSelectFromExecution(m.state), nil
		case "space":
			if m.hasFocusedModel() {
				id := m.filteredModels[m.selectedModel].ID
				m.selectedModels[id] = !m.selectedModels[id]
				if !m.selectedModels[id] {
					delete(m.selectedModels, id)
				}
				m.error = ""
			}
		case "enter":
			selected := m.modelsForRun()
			if len(selected) == 0 {
				m.error = "Select at least one model"
				return m, nil
			}
			return m.startBenchmark(selected)
		case "up":
			m.selectedModel, m.scrollOffset = moveListSelection(
				m.selectedModel, len(m.filteredModels), -1, m.scrollOffset, m.maxVisible(),
			)
		case "down":
			m.selectedModel, m.scrollOffset = moveListSelection(
				m.selectedModel, len(m.filteredModels), 1, m.scrollOffset, m.maxVisible(),
			)
		default:
			var cmd tea.Cmd
			m.modelInput, cmd = m.modelInput.Update(msg)
			m.filteredModels = m.models
			if query := m.modelInput.Value(); query != "" {
				m.filteredModels = bridge.FuzzySearch(m.models, query)
			}
			m.selectedModel = 0
			m.scrollOffset = 0
			return m, cmd
		}
	case modelsLoadedMsg:
		m.loadingModels = false
		if msg.err != nil {
			m.modelLoadError = msg.err.Error()
		} else {
			m.models = msg.models
			m.filteredModels = msg.models
			if m.selectedModels == nil {
				m.selectedModels = make(map[string]bool)
			}
			m.selectedModel = 0
			m.modelLoadError = ""
		}
		return m, nil
	case spinner.TickMsg:
		if !m.loadingModels {
			return m, nil
		}
		var cmd tea.Cmd
		m.loadingSpinner, cmd = m.loadingSpinner.Update(msg)
		return m, cmd
	}
	return m, nil
}

func (m ModelSelectModel) View() tea.View {
	lines := []string{
		styles.SectionLabelStyle.Render("03 / MODELS"),
		styles.HeadingStyle.Render("SELECT MODELS"),
		"",
	}
	providerLine := lipgloss.NewStyle().Foreground(styles.GrayMedium).Render("PROVIDER  ") +
		lipgloss.NewStyle().Foreground(styles.OrangeMid).Bold(true).Render(m.provider.Name)
	lines = append(lines, providerLine, "")
	inputLabel := lipgloss.NewStyle().Foreground(styles.GrayMedium).Render("FILTER  ")
	lines = append(lines, inputLabel+m.modelInput.View(), m.selectionStatus(), "")

	switch {
	case m.loadingModels:
		lines = append(lines, lipgloss.NewStyle().Foreground(styles.OrangePrimary).
			Render(m.loadingSpinner.View()+" Loading models..."))
	case m.modelLoadError != "":
		lines = append(lines, styles.ErrorStyle.Render("Error: "+m.modelLoadError))
	case len(m.filteredModels) > 0:
		lines = append(lines, lipgloss.NewStyle().Foreground(styles.OrangeMid).Bold(true).Render("MODEL CATALOG"))
		endIdx := min(m.scrollOffset+m.maxVisible(), len(m.filteredModels))
		for i := m.scrollOffset; i < endIdx; i++ {
			lines = append(lines, m.renderModelRow(m.filteredModels[i], i == m.selectedModel))
		}
		if len(m.filteredModels) > endIdx {
			lines = append(lines, lipgloss.NewStyle().Foreground(styles.GrayDim).
				Render(fmt.Sprintf("... %d more", len(m.filteredModels)-endIdx)))
		}
		if len(m.filteredModels) > m.maxVisible() {
			lines = append(lines, "", lipgloss.NewStyle().Foreground(styles.GrayDim).
				Render(fmt.Sprintf("(%d/%d)", m.selectedModel+1, len(m.filteredModels))))
		}
	}
	if !m.loadingModels && m.error == "" && len(m.filteredModels) == 0 && strings.TrimSpace(m.modelInput.Value()) != "" {
		lines = append(lines, lipgloss.NewStyle().Foreground(styles.GrayMedium).
			Render("No catalog match — Enter runs this custom model ID"))
	}
	lines = append(lines, "", lipgloss.NewStyle().Foreground(styles.GrayDim).
		Render("Type: Filter • ↑/↓: Focus • Space: Mark • Enter: Run marked/focused • ←: Back • Ctrl+C: Quit"))
	content := lipgloss.NewStyle().Padding(2, 2).MaxWidth(m.width).MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))
	return newView(content)
}

func (m ModelSelectModel) maxVisible() int { return max(3, m.height-12) }

func (m ModelSelectModel) hasFocusedModel() bool {
	return len(m.filteredModels) > 0 && m.selectedModel < len(m.filteredModels)
}

func (m ModelSelectModel) modelsForRun() []string {
	selected := m.selectedModelIDs()
	if len(selected) == 0 && m.hasFocusedModel() {
		return []string{m.filteredModels[m.selectedModel].ID}
	}
	if len(selected) == 0 {
		if customModel := strings.TrimSpace(m.modelInput.Value()); customModel != "" {
			return []string{customModel}
		}
	}
	return selected
}

func (m ModelSelectModel) selectedModelIDs() []string {
	selected := make([]string, 0, len(m.selectedModels))
	for _, model := range m.models {
		if m.selectedModels[model.ID] {
			selected = append(selected, model.ID)
		}
	}
	return selected
}

func (m ModelSelectModel) startBenchmark(modelIDs []string) (tea.Model, tea.Cmd) {
	m.state.Provider = bridge.ConvertProviderNameToEnvKey(m.provider.Name)
	m.state.ProviderKey = m.provider.EnvKey
	m.state.Model = strings.Join(modelIDs, ",")
	model := NewBenchmarkModel(m.state)
	return model, model.Init()
}

func (m ModelSelectModel) selectionStatus() string {
	status := "No models marked — Enter runs the focused model"
	if len(m.selectedModels) == 1 {
		status = "1 model marked for this run"
	} else if len(m.selectedModels) > 1 {
		status = fmt.Sprintf("%d models marked for this run", len(m.selectedModels))
	}
	return lipgloss.NewStyle().Foreground(styles.GrayDim).Render(status)
}

func (m ModelSelectModel) renderModelRow(model bridge.Model, focused bool) string {
	rowWidth := min(96, max(36, m.width-8))
	marker, markerColor := "[ ]", styles.GrayDim
	if m.selectedModels[model.ID] {
		marker, markerColor = "[x]", styles.OrangePrimary
	}
	date := ""
	if !model.AddedAt.IsZero() {
		date = "Added " + model.AddedAt.Format("2006-01-02")
	}
	labelWidth := rowWidth - 7
	if date != "" {
		labelWidth -= len(date) + 1
	}
	labelWidth = max(8, labelWidth)
	label := lipgloss.NewStyle().Width(labelWidth).Render(truncateText(model.ID, labelWidth))
	prefix := "  "
	rowStyle := lipgloss.NewStyle().Width(rowWidth).Foreground(styles.GrayLight)
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

func (m ModelSelectModel) loadModels() (ModelSelectModel, tea.Cmd) {
	m.loadingModels = true
	m.modelLoadError = ""
	fetchModels := func() tea.Msg {
		models, err := bridge.FetchModels(m.provider.EnvKey, m.provider.APIKey)
		return modelsLoadedMsg{models: models, err: err}
	}
	return m, tea.Batch(fetchModels, m.loadingSpinner.Tick)
}
