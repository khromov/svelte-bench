package models

import (
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// WelcomeModel is the welcome screen model
type WelcomeModel struct {
	state           *SharedState
	selectedOption  int
	hasExistingConf bool
	width           int
	height          int
}

// NewWelcomeModel creates a new welcome model
func NewWelcomeModel(cfg *config.Config) WelcomeModel {
	hasConf := cfg != nil && cfg.HasAnyAPIKeys()

	state := &SharedState{
		Config: cfg,
	}

	if !hasConf {
		// Initialize empty config
		state.Config = &config.Config{
			APIKeys: make(map[string]string),
		}
	}

	return WelcomeModel{
		state:           state,
		selectedOption:  0,
		hasExistingConf: hasConf,
		width:           80,
		height:          24,
	}
}

func (m WelcomeModel) Init() tea.Cmd {
	return nil
}

func (m WelcomeModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
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

		case "up":
			if m.hasExistingConf {
				m.selectedOption = (m.selectedOption - 1 + 2) % 2
			}

		case "down":
			if m.hasExistingConf {
				m.selectedOption = (m.selectedOption + 1) % 2
			}

		case "enter":
			// Navigate to next screen
			if m.hasExistingConf && m.selectedOption == 0 {
				// Use existing config - go to execution mode selection
				return NewExecutionModeFromWelcome(m.state), nil
			} else {
				// Configure API keys
				return NewAPIKeyConfigModel(m.state), nil
			}
		}
	}

	return m, nil
}

func (m WelcomeModel) View() string {
	var lines []string

	// Title - simple and clean
	title := styles.HeadingStyle.Render("🔥 SVELTEBENCH")

	subtitle := lipgloss.NewStyle().
		Foreground(styles.OrangeMid).
		Render("LLM Benchmark Tool for Svelte 5")

	lines = append(lines, title, subtitle, "", "")

	// Options
	if m.hasExistingConf {
		opt1 := "  Use existing API keys"
		opt2 := "  Configure new API keys"

		if m.selectedOption == 0 {
			opt1 = lipgloss.NewStyle().
				Foreground(styles.OrangePrimary).
				Bold(true).
				Render("▸ Use existing API keys")
		} else {
			opt2 = lipgloss.NewStyle().
				Foreground(styles.OrangePrimary).
				Bold(true).
				Render("▸ Configure new API keys")
		}

		lines = append(lines, opt1, opt2)
	} else {
		opt := lipgloss.NewStyle().
			Foreground(styles.OrangePrimary).
			Bold(true).
			Render("▸ Configure API keys to get started")
		lines = append(lines, opt)
	}

	// Help text
	lines = append(lines, "")
	var help string
	if m.hasExistingConf {
		help = "↑/↓: Navigate • Enter: Select • Ctrl+C: Quit"
	} else {
		help = "Enter: Continue • Ctrl+C: Quit"
	}
	lines = append(lines, lipgloss.NewStyle().
		Foreground(styles.GrayDim).
		Render(help))

	content := lipgloss.NewStyle().
		Padding(2, 2).
		MaxWidth(m.width).
		MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, lines...))

	return content
}
