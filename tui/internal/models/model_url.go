package models

import (
	"charm.land/bubbles/v2/textinput"
	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
	"fmt"
	"net/url"
	"strings"
	"svelte-bench/tui/internal/styles"
)

type ModelURLModel struct {
	state *SharedState
	ids   []string
	index int
	input textinput.Model
	err   string
}

func NewModelURLModel(state *SharedState, ids []string) ModelURLModel {
	state.ModelURLs = make(map[string]string)
	input := textinput.New()
	input.Placeholder = "https://example.com/model (optional)"
	input.SetWidth(60)
	input.Focus()
	m := ModelURLModel{state: state, ids: ids, input: input}
	m.prefill()
	return m
}
func (m *ModelURLModel) prefill() {
	id := m.ids[m.index]
	value := m.state.ModelURLs[id]
	if value == "" && strings.HasPrefix(id, "hf.co/") {
		value = "https://huggingface.co/" + strings.SplitN(strings.TrimPrefix(id, "hf.co/"), ":", 2)[0]
	}
	m.input.SetValue(value)
}
func (m ModelURLModel) Init() tea.Cmd { return textinput.Blink }
func (m ModelURLModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if key, ok := msg.(tea.KeyPressMsg); ok {
		switch key.String() {
		case "ctrl+c":
			return m, tea.Quit
		case "enter":
			value := strings.TrimSpace(m.input.Value())
			if value != "" {
				u, err := url.Parse(value)
				if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
					m.err = "Enter a valid http or https URL, or leave blank."
					return m, nil
				}
				m.state.ModelURLs[m.ids[m.index]] = value
			} else {
				delete(m.state.ModelURLs, m.ids[m.index])
			}
			m.index++
			if m.index == len(m.ids) {
				next := NewBenchmarkModel(m.state)
				return next, next.Init()
			}
			m.err = ""
			m.prefill()
			return m, nil
		case "esc":
			if m.index > 0 {
				m.index--
				m.err = ""
				m.prefill()
				return m, nil
			}
			next := NewModelSelectionModel(m.state)
			return next, next.loadModels(next.providers[next.selectedProvider])
		}
	}
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return m, cmd
}
func (m ModelURLModel) View() tea.View {
	content := lipgloss.JoinVertical(lipgloss.Left, styles.SectionLabelStyle.Render("04 / MODEL PAGE"), styles.CreateBoldGradient("MODEL URL", styles.PrimaryGradient), "", fmt.Sprintf("Model %d of %d: %s", m.index+1, len(m.ids), m.ids[m.index]), "Add a link to the model page for the results (optional).", "", m.input.View(), m.err, "", "Enter: Continue • Esc: Back • Ctrl+C: Quit")
	return newView(lipgloss.NewStyle().Padding(2, 2).Render(content))
}
