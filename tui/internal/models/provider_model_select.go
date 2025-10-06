package models

import (
	"fmt"
	"os"
	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type modelsLoadedMsg struct {
	models []bridge.Model
	err    error
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
	}
}

func (m ProviderModelSelectModel) Init() tea.Cmd {
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
				// Move to model input step
				m.step = 1
				m.modelInput.Focus()
				return m, m.loadModels(m.providers[m.selectedProvider])
			}
		} else {
			// Step 1: Type model name with autocomplete
			switch msg.String() {
			case "esc":
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

					// EMERGENCY DEBUG
					if debugFile, err := os.Create("/tmp/tui-model-selected.txt"); err == nil {
						fmt.Fprintf(debugFile, "Model selected from list\n")
						fmt.Fprintf(debugFile, "Provider name: '%s'\n", m.providers[m.selectedProvider].Name)
						fmt.Fprintf(debugFile, "Converted provider: '%s'\n", m.state.Provider)
						fmt.Fprintf(debugFile, "Model: '%s'\n", m.state.Model)
						debugFile.Close()
					}

					return NewBenchmarkModel(m.state), nil
				} else if m.modelInput.Value() != "" {
					// User typed a custom model name
					m.state.Provider = bridge.ConvertProviderNameToEnvKey(m.providers[m.selectedProvider].Name)
					m.state.ProviderKey = m.providers[m.selectedProvider].EnvKey
					m.state.Model = m.modelInput.Value()

					// EMERGENCY DEBUG
					if debugFile, err := os.Create("/tmp/tui-model-typed.txt"); err == nil {
						fmt.Fprintf(debugFile, "Model typed manually\n")
						fmt.Fprintf(debugFile, "Provider name: '%s'\n", m.providers[m.selectedProvider].Name)
						fmt.Fprintf(debugFile, "Converted provider: '%s'\n", m.state.Provider)
						fmt.Fprintf(debugFile, "Model: '%s'\n", m.state.Model)
						debugFile.Close()
					}

					return NewBenchmarkModel(m.state), nil
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
	}

	return m, nil
}

func (m ProviderModelSelectModel) View() string {
	var lines []string

	// Header
	if m.step == 0 {
		title := lipgloss.NewStyle().
			Bold(true).
			Foreground(styles.OrangePrimary).
			Render("📡 Select Provider")
		lines = append(lines, title, "")
	} else {
		title := lipgloss.NewStyle().
			Bold(true).
			Foreground(styles.OrangePrimary).
			Render("🤖 Select Model")
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
			if i == m.selectedProvider {
				lines = append(lines, lipgloss.NewStyle().
					Foreground(styles.OrangePrimary).
					Bold(true).
					Render("▸ "+provider.Name))
			} else {
				lines = append(lines, "  "+provider.Name)
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
			Render("↑/↓: Navigate • Enter: Select • Ctrl+C: Quit"))
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
			Render("Type to search • ↑/↓: Navigate • Enter: Select • Esc: Back • Ctrl+C: Quit"))
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
