package models

import (
	"svelte-bench/tui/internal/config"
	"svelte-bench/tui/internal/styles"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// WelcomeModel is the welcome screen model
type WelcomeModel struct {
	state  *SharedState
	width  int
	height int
}

// NewWelcomeModel creates a new welcome model
func NewWelcomeModel(cfg *config.Config) WelcomeModel {
	state := &SharedState{
		Config: cfg,
	}

	if cfg == nil {
		// Initialize empty config
		state.Config = &config.Config{
			APIKeys: make(map[string]string),
		}
	}

	return WelcomeModel{
		state:  state,
		width:  80,
		height: 24,
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

		case "enter":
			return NewProviderModelSelectModel(m.state), nil
		}
	}

	return m, nil
}

func (m WelcomeModel) View() string {
	var lines []string

	// Title - simple and clean
	title := styles.HeadingStyle.Render("SVELTEBENCH")

	subtitle := lipgloss.NewStyle().
		Foreground(styles.OrangeMid).
		Render("LLM Benchmark Tool for Svelte 5")

	lines = append(lines, title, subtitle, "", "")

	lines = append(lines, styles.ProgressTextStyle.Render("Press Enter to select a provider"))

	// Help text
	lines = append(lines, "")
	var help string
	help = "Enter: Continue • Double Esc: Quit • Ctrl+C: Quit"
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
