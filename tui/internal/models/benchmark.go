package models

import (
	"fmt"
	"image/color"
	"svelte-bench/tui/internal/bridge"
	"svelte-bench/tui/internal/styles"
	"time"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"
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

	case tea.KeyPressMsg:
		switch msg.String() {
		case "ctrl+c":
			return m, tea.Quit
		case "esc":
			if DoubleEscapeRequestsExit() {
				return m, tea.Quit
			}
		}
		// Ignore navigation and other keys during a run. In particular, do not
		// schedule another animation tick for each repeated arrow-key event.
		return m, nil

	case benchmarkStartMsg:
		if !m.running {
			m.running = true
			m.startTime = time.Now()
		}
		return m, m.tickCmd()

	case benchmarkEventMsg:
		event := bridge.BenchmarkEvent(msg)
		m.handleEvent(event)
		// The animation tick reschedules itself when it fires. Starting another
		// tick here for every benchmark event would create concurrent timers and
		// make the animation speed up as sample events arrive.
		return m, m.waitForEvent()

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
			return m, m.tickCmd()
		}
		return m, nil
	}

	return m, nil
}

func (m BenchmarkModel) View() tea.View {
	// The fixed portions of this view use 13 rows including the outer padding.
	// Calculate the test window from that actual footprint so all categories are
	// shown whenever the terminal has room, instead of hiding most of them at
	// ordinary terminal heights.
	fixedRows := 15
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
	mode := "Sequential samples"
	if m.state.Parallel {
		mode = "Parallel samples"
	} else if m.state.Madmax {
		mode = "MADMAX: parallel categories + samples"
	}

	title := styles.HeadingStyle.Render("BENCHMARK RUNNING")

	info := lipgloss.NewStyle().
		Foreground(styles.GrayMedium).
		Render(fmt.Sprintf("%s • %s • %s", m.state.Provider, m.state.Model, mode))

	sections = append(sections, title, info, "")

	// Overall progress - compact
	barWidth := m.width - 20
	if barWidth > 56 {
		barWidth = 56
	}
	if barWidth < 16 {
		barWidth = 16
	}

	percent := 0
	if m.totalSamples > 0 {
		percent = int((float64(m.currentCount) / float64(m.totalSamples)) * 100)
	}

	progressLabel := lipgloss.NewStyle().
		Foreground(styles.OrangeLight).
		Render(fmt.Sprintf("Overall progress: %d%% • %d/%d samples", percent, m.currentCount, m.totalSamples))

	// Keep the rest of the UI on the normal animation clock while making only
	// the progress-bar highlight travel three times faster.
	animatedBar := styles.RenderAnimatedProgressBar(m.currentCount, m.totalSamples, barWidth, m.frame*3)

	sections = append(sections, progressLabel, animatedBar, "")
	sections = append(sections, m.renderActiveSummary(), "")

	// Tests - scrollable
	testsHeader := lipgloss.NewStyle().
		Foreground(styles.OrangeLight).
		Bold(true).
		Render("TEST PROGRESS")

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
	sections = append(sections, m.renderOverallScore())

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

	return newView(content)
}

func (m *BenchmarkModel) renderTest(test *TestResult) string {
	var icon string
	var iconColor color.Color

	switch test.Status {
	case StatusCompleted, StatusFailed:
		if test.Current >= test.Total {
			icon = "Done"
			iconColor = styles.OrangeSuccess
		} else {
			icon = "x"
			iconColor = styles.OrangeError
		}
	case StatusRunning:
		icon = styles.SpinnerFrames[(m.frame/4)%len(styles.SpinnerFrames)]
		iconColor = styles.OrangePrimary
	case StatusRateLimit:
		icon = "~"
		iconColor = styles.OrangeWarning
	default:
		icon = "-"
		iconColor = styles.GrayDim
	}

	iconStyled := lipgloss.NewStyle().
		Width(5).
		Align(lipgloss.Right).
		Foreground(iconColor).
		Bold(true).
		Render(icon)

	// Test name
	nameColor := styles.GrayMedium
	if test.Status == StatusRunning {
		nameColor = styles.OrangePrimary
	} else if test.Status == StatusCompleted {
		nameColor = styles.GrayDim
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
	if test.Status == StatusRateLimit {
		statusText = lipgloss.NewStyle().
			Width(5).
			Align(lipgloss.Right).
			Foreground(styles.OrangeWarning).
			Render(fmt.Sprintf("~%ds", test.RetryAfter))
	}

	if (test.Status == StatusCompleted || test.Status == StatusFailed) && test.Current >= test.Total {
		statusText = lipgloss.NewStyle().
			Width(5).
			Align(lipgloss.Right).
			Foreground(scoreColor(test.PassAtOne)).
			Render(fmt.Sprintf("%.0f%%", test.PassAtOne*100))
	}

	if statusText == "" {
		statusText = lipgloss.NewStyle().Width(5).Render("")
	}

	return fmt.Sprintf(" %s %s %s %s %s", iconStyled, name, miniBar, progressText, statusText)
}

func (m BenchmarkModel) renderOverallScore() string {
	completed := 0
	totalScore := 0.0
	for _, name := range m.testOrder {
		test := m.tests[name]
		if (test.Status == StatusCompleted || test.Status == StatusFailed) && test.Current >= test.Total {
			completed++
			totalScore += test.PassAtOne
		}
	}

	if completed == 0 {
		return lipgloss.NewStyle().
			Foreground(styles.GrayDim).
			Render(fmt.Sprintf("Overall score: -- (%d/%d tests complete)", completed, len(m.testOrder)))
	}

	overall := totalScore / float64(completed)
	return lipgloss.NewStyle().
		Foreground(scoreColor(overall)).
		Bold(true).
		Render(fmt.Sprintf("Overall score: %.0f%% (%d/%d tests complete)", overall*100, completed, len(m.testOrder)))
}

func scoreColor(score float64) color.Color {
	if score < 0.5 {
		return styles.OrangeError
	}
	if score < 0.7 {
		return styles.OrangeWarning
	}
	return styles.OrangeSuccess
}

func (m BenchmarkModel) renderActiveSummary() string {
	label := "Preparing next test..."
	running := make([]*TestResult, 0, len(m.testOrder))
	for _, name := range m.testOrder {
		test := m.tests[name]
		if test.Status == StatusRunning {
			running = append(running, test)
		}
	}

	if m.state.Madmax && len(running) > 0 {
		completed := 0
		total := 0
		for _, test := range running {
			completed += test.Current
			total += test.Total
		}
		label = fmt.Sprintf("MADMAX: %d categories running • %d/%d samples complete", len(running), completed, total)
	} else {
		for _, test := range running {
			label = fmt.Sprintf("Running: %s • %d/%d samples complete", test.TestName, test.Current, test.Total)
			if m.state.Parallel {
				label = fmt.Sprintf("Running samples: %s • %d/%d complete", test.TestName, test.Current, test.Total)
			}
			break
		}
	}

	return lipgloss.NewStyle().
		Background(styles.BgMedium).
		Foreground(styles.OrangeLight).
		Bold(true).
		Padding(0, 1).
		Render(label)
}

func (m *BenchmarkModel) handleEvent(event bridge.BenchmarkEvent) {
	switch event.Type {
	case bridge.EventTestStart:
		if test, ok := m.tests[event.Test]; ok {
			test.Status = StatusRunning
			test.Current = 0
			test.RetryAfter = 0
			test.RetryAttempt = 0
		}

	case bridge.EventSampleProgress:
		if test, ok := m.tests[event.Test]; ok {
			test.Status = StatusRunning
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
		// MADMAX identifies the category being throttled. Legacy events without
		// a test name still apply to every active category.
		if event.Test != "" {
			if test, ok := m.tests[event.Test]; ok {
				test.Status = StatusRateLimit
				test.RetryAfter = event.RetryAfter
				test.RetryAttempt = event.RetryAttempt
			}
		} else {
			for _, test := range m.tests {
				if test.Status == StatusRunning {
					test.Status = StatusRateLimit
					test.RetryAfter = event.RetryAfter
					test.RetryAttempt = event.RetryAttempt
				}
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
				Madmax:   m.state.Madmax,
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
