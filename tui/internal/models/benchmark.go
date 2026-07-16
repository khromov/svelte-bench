package models

import (
	"fmt"
	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/styles"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type benchmarkStartMsg struct{}
type benchmarkEventMsg bridge.BenchmarkEvent
type benchmarkCompleteMsg struct{}
type benchmarkErrorMsg struct{ err error }

// BenchmarkModel handles benchmark execution
type BenchmarkModel struct {
	state        *SharedState
	tests        map[string]*TestResult
	testOrder    []string
	startTime    time.Time
	running      bool
	totalSamples int
	currentCount int
	width        int
	height       int
	frame        int // For animations
	eventChan    chan bridge.BenchmarkEvent
}

// NewBenchmarkModel creates a new benchmark model
func NewBenchmarkModel(state *SharedState) BenchmarkModel {
	// Initialize tests
	testNames := []string{
		"hello-world", "counter", "derived", "derived-by",
		"each", "effect", "props", "snippets", "inspect",
	}

	tests := make(map[string]*TestResult)
	for _, name := range testNames {
		tests[name] = &TestResult{
			TestName: name,
			Total:    10,
			Current:  0,
			Status:   StatusQueued,
		}
	}

	return BenchmarkModel{
		state:        state,
		tests:        tests,
		testOrder:    testNames,
		totalSamples: len(testNames) * 10,
		running:      false,
		width:        80,
		height:       24,
		eventChan:    make(chan bridge.BenchmarkEvent, 1024),
	}
}

func (m BenchmarkModel) Init() tea.Cmd {
	return tea.Batch(
		m.runBenchmark(),
		m.waitForEvent(),
	)
}

// waitForEvent waits for events from the benchmark runner
func (m BenchmarkModel) waitForEvent() tea.Cmd {
	return func() tea.Msg {
		event, ok := <-m.eventChan
		if !ok {
			// Channel closed, benchmark complete
			return benchmarkCompleteMsg{}
		}
		return benchmarkEventMsg(event)
	}
}

func (m BenchmarkModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
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
		}

	case benchmarkStartMsg:
		if !m.running {
			m.running = true
			m.startTime = time.Now()
		}
		return m, m.tickCmd()

	case benchmarkEventMsg:
		event := bridge.BenchmarkEvent(msg)
		m.handleEvent(event)
		// Keep both event consumption and the elapsed-time animation alive.
		return m, tea.Batch(m.waitForEvent(), m.tickCmd())

	case benchmarkErrorMsg:
		m.running = false
		m.state.Error = msg.err.Error()
		return m, nil

	case benchmarkCompleteMsg:
		m.running = false
		m.state.Completed = true
		return NewResultsModel(m.state), nil

	default:
		// Tick for animations
		if _, ok := msg.(time.Time); ok {
			m.frame++
		}
	}

	return m, m.tickCmd()
}

func (m BenchmarkModel) View() string {
	// The fixed portions of this view use 13 rows including the outer padding.
	// Calculate the test window from that actual footprint so all categories are
	// shown whenever the terminal has room, instead of hiding most of them at
	// ordinary terminal heights.
	fixedRows := 13
	if m.state.Error != "" {
		fixedRows += 2
	}
	maxTestsShown := m.height - fixedRows
	if maxTestsShown < 1 {
		maxTestsShown = 1
	}
	if maxTestsShown > len(m.testOrder) {
		maxTestsShown = len(m.testOrder)
	}

	var sections []string

	// Header - compact
	mode := "Sequential"
	if m.state.Parallel {
		mode = "Parallel"
	}

	title := styles.HeadingStyle.Render("BENCHMARK RUNNING")

	info := lipgloss.NewStyle().
		Foreground(styles.OrangeMid).
		Render(fmt.Sprintf("%s • %s • %s", m.state.Provider, m.state.Model, mode))

	sections = append(sections, title, info, "")

	// Overall progress - compact
	barWidth := m.width - 10
	if barWidth > 50 {
		barWidth = 50
	}
	if barWidth < 20 {
		barWidth = 20
	}

	percent := 0
	if m.totalSamples > 0 {
		percent = int((float64(m.currentCount) / float64(m.totalSamples)) * 100)
	}

	progressLabel := lipgloss.NewStyle().
		Foreground(styles.OrangeLight).
		Render(fmt.Sprintf("Progress: %d%% (%d/%d)", percent, m.currentCount, m.totalSamples))

	animatedBar := styles.RenderAnimatedProgressBar(m.currentCount, m.totalSamples, barWidth, m.frame)

	sections = append(sections, progressLabel, animatedBar, "")

	// Tests - scrollable
	testsHeader := lipgloss.NewStyle().
		Foreground(styles.OrangeMid).
		Bold(true).
		Render("Tests:")

	sections = append(sections, testsHeader)

	for i := 0; i < maxTestsShown && i < len(m.testOrder); i++ {
		test := m.tests[m.testOrder[i]]
		sections = append(sections, m.renderTest(test))
	}

	if maxTestsShown < len(m.testOrder) {
		remaining := len(m.testOrder) - maxTestsShown
		sections = append(sections, lipgloss.NewStyle().
			Foreground(styles.GrayDim).
			Render(fmt.Sprintf("  ... and %d more tests", remaining)))
	}

	sections = append(sections, "")

	// Stats - compact
	var elapsed time.Duration
	var elapsedStr string
	var stats string

	if m.running && !m.startTime.IsZero() {
		elapsed = time.Since(m.startTime)
		elapsedStr = formatDuration(elapsed)

		stats = fmt.Sprintf("Elapsed: %s", elapsedStr)
	} else {
		stats = "Starting..."
	}

	sections = append(sections, lipgloss.NewStyle().
		Foreground(styles.GrayMedium).
		Render(stats))

	// Show error if present
	if m.state.Error != "" {
		sections = append(sections, "")
		sections = append(sections, lipgloss.NewStyle().
			Foreground(styles.OrangeError).
			Bold(true).
			Render("Error: "+m.state.Error))
	}

	// Help
	sections = append(sections, "")
	sections = append(sections, lipgloss.NewStyle().
		Foreground(styles.GrayDim).
		Render("Ctrl+C: Cancel"))

	content := lipgloss.NewStyle().
		Padding(1, 2).
		MaxWidth(m.width).
		MaxHeight(m.height).
		Render(lipgloss.JoinVertical(lipgloss.Left, sections...))

	return content
}

func (m *BenchmarkModel) renderTest(test *TestResult) string {
	var icon string
	var iconColor lipgloss.Color

	switch test.Status {
	case StatusCompleted:
		icon = "✓"
		iconColor = styles.OrangeSuccess
	case StatusRunning:
		icon = styles.SpinnerFrames[m.frame%len(styles.SpinnerFrames)]
		iconColor = styles.OrangePrimary
	case StatusRateLimit:
		icon = "~"
		iconColor = styles.OrangeWarning
	case StatusFailed:
		icon = "x"
		iconColor = styles.OrangeError
	default:
		icon = "-"
		iconColor = styles.GrayDim
	}

	iconStyled := lipgloss.NewStyle().
		Width(2).
		Align(lipgloss.Right).
		Foreground(iconColor).
		Bold(true).
		Render(icon)

	// Test name
	nameColor := styles.GrayMedium
	if test.Status == StatusRunning {
		nameColor = styles.OrangePrimary
	} else if test.Status == StatusCompleted {
		nameColor = styles.OrangeSuccess
	}

	nameStyle := lipgloss.NewStyle().
		Width(15).
		Foreground(nameColor)
	name := nameStyle.Render(test.TestName)

	// Mini progress bar
	miniBar := styles.RenderProgressBar(test.Current, test.Total, 12)

	// Progress text
	progressText := lipgloss.NewStyle().
		Width(5).
		Align(lipgloss.Right).
		Foreground(styles.OrangeLight).
		Render(fmt.Sprintf("%2d/%d", test.Current, test.Total))

	// Status or result
	statusText := ""
	if test.Status == StatusCompleted {
		passColor := styles.OrangeSuccess
		if test.PassAtOne < 0.5 {
			passColor = styles.OrangeError
		} else if test.PassAtOne < 0.7 {
			passColor = styles.OrangeWarning
		}
		statusText = lipgloss.NewStyle().
			Width(5).
			Align(lipgloss.Right).
			Foreground(passColor).
			Render(fmt.Sprintf("%.0f%%", test.PassAtOne*100))
	}

	if statusText == "" {
		statusText = lipgloss.NewStyle().Width(5).Render("")
	}

	return fmt.Sprintf(" %s %s %s %s %s", iconStyled, name, miniBar, progressText, statusText)
}

func (m *BenchmarkModel) handleEvent(event bridge.BenchmarkEvent) {
	switch event.Type {
	case bridge.EventTestStart:
		if test, ok := m.tests[event.Test]; ok {
			test.Status = StatusRunning
			test.Current = 0
		}

	case bridge.EventSampleProgress:
		if test, ok := m.tests[event.Test]; ok {
			previous := test.Current
			test.Current = event.Sample
			if event.Sample > previous {
				m.recordProgress(event.Sample - previous)
			}
		}

	case bridge.EventTestComplete:
		if test, ok := m.tests[event.Test]; ok {
			if event.Total > test.Current {
				m.recordProgress(event.Total - test.Current)
			}
			test.Current = event.Total
			test.Passed = event.Passed
			test.PassAtOne = event.PassAtOne
			test.PassAtTen = event.PassAtTen
			if event.Passed {
				test.Status = StatusCompleted
			} else {
				test.Status = StatusFailed
			}
		}

	case bridge.EventRateLimit:
		// Mark currently running test as rate limited
		for _, test := range m.tests {
			if test.Status == StatusRunning {
				test.Status = StatusRateLimit
				test.RetryAfter = event.RetryAfter
			}
		}

	case bridge.EventError:
		// Handle benchmark error
		m.running = false
		m.state.Error = event.Error

	case bridge.EventComplete:
		// Benchmark complete
		m.state.Results = make([]TestResult, 0, len(m.tests))
		for _, test := range m.tests {
			m.state.Results = append(m.state.Results, *test)
		}
	}
}

func (m *BenchmarkModel) recordProgress(samples int) {
	if samples <= 0 {
		return
	}

	m.currentCount += samples
}

func (m BenchmarkModel) runBenchmark() tea.Cmd {
	return func() tea.Msg {
		// Start the actual TypeScript benchmark in a goroutine
		go func() {
			// Convert config to API keys map
			apiKeys := make(map[string]string)
			if m.state.Config != nil {
				for key, value := range m.state.Config.APIKeys {
					apiKeys[key] = value
				}
			}

			config := bridge.BenchmarkConfig{
				Provider: m.state.Provider,
				Model:    m.state.Model,
				APIKeys:  apiKeys,
				Parallel: m.state.Parallel,
				Samples:  10,
			}

			// Run benchmark and handle events
			err := bridge.RunBenchmark(config, func(event bridge.BenchmarkEvent) {
				// Preserve every progress event for the Update loop.
				m.eventChan <- event
			})

			// Send error event if benchmark failed
			if err != nil {
				m.eventChan <- bridge.BenchmarkEvent{
					Type:  bridge.EventError,
					Error: err.Error(),
				}
			}

			// Close channel when done
			close(m.eventChan)
		}()

		// Signal benchmark is starting
		return benchmarkStartMsg{}
	}
}

func (m BenchmarkModel) tickCmd() tea.Cmd {
	return tea.Tick(100*time.Millisecond, func(t time.Time) tea.Msg {
		return t
	})
}

func formatDuration(d time.Duration) string {
	seconds := int(d.Seconds())
	if seconds < 60 {
		return fmt.Sprintf("%ds", seconds)
	}
	minutes := seconds / 60
	secs := seconds % 60
	if minutes < 60 {
		return fmt.Sprintf("%dm%ds", minutes, secs)
	}
	hours := minutes / 60
	mins := minutes % 60
	return fmt.Sprintf("%dh%dm", hours, mins)
}
