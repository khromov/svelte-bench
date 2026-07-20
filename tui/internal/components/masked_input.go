package components

import (
	"strings"

	"svelte-bench/tui/internal/styles"

	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
)

// MaskedInput wraps a text input with masking for API keys
type MaskedInput struct {
	Input       textinput.Model
	Placeholder string
	Width       int
	ShowMasked  bool // If true, shows ••••last8chars
}

// NewMaskedInput creates a new masked input
func NewMaskedInput(placeholder string, width int) MaskedInput {
	ti := textinput.New()
	ti.Placeholder = placeholder
	ti.SetWidth(width)
	ti.CharLimit = 200

	// Style the input
	inputStyles := ti.Styles()
	inputStyles.Focused.Prompt = lipgloss.NewStyle().Foreground(styles.OrangePrimary)
	inputStyles.Focused.Text = lipgloss.NewStyle().Foreground(styles.White)
	inputStyles.Focused.Placeholder = lipgloss.NewStyle().Foreground(styles.GrayMedium)
	inputStyles.Blurred = inputStyles.Focused
	ti.SetStyles(inputStyles)

	return MaskedInput{
		Input:       ti,
		Placeholder: placeholder,
		Width:       width,
		ShowMasked:  false,
	}
}

// Update updates the input
func (m *MaskedInput) Update(msg tea.Msg) tea.Cmd {
	var cmd tea.Cmd
	m.Input, cmd = m.Input.Update(msg)
	return cmd
}

// View renders the input
func (m MaskedInput) View() string {
	return m.Input.View()
}

// Value returns the current value
func (m MaskedInput) Value() string {
	return m.Input.Value()
}

// SetValue sets the value
func (m *MaskedInput) SetValue(s string) {
	m.Input.SetValue(s)
}

// Focus focuses the input
func (m *MaskedInput) Focus() tea.Cmd {
	return m.Input.Focus()
}

// Blur removes focus
func (m *MaskedInput) Blur() {
	m.Input.Blur()
}

// MaskAPIKey masks an API key showing only the last 8 characters
func MaskAPIKey(key string) string {
	if len(key) <= 8 {
		return strings.Repeat("•", len(key))
	}
	masked := strings.Repeat("•", len(key)-8)
	return masked + key[len(key)-8:]
}
