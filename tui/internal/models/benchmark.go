package models

import (
	"fmt"
	"os"
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
		eventChan:    make(chan bridge.BenchmarkEvent, 100),
	}
}

func (m BenchmarkModel) Init() tea.Cmd {
	// EMERGENCY DEBUG: Write that Init was called
	if debugFile, err := os.Create("/tmp/tui-init-called.txt"); err == nil {
		fmt.Fprintf(debugFile, "BenchmarkModel.Init() was called\n")
		fmt.Fprintf(debugFile, "Provider: '%s'\n", m.state.Provider)
		fmt.Fprintf(debugFile, "Model: '%s'\n", m.state.Model)
		fmt.Fprintf(debugFile, "Running: %v\n", m.running)
		debugFile.Close()
	}

	return tea.Batch(
		m.runBenchmark(),
		m.waitForEvent(),
		m.tickCmd(),
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
		}

	case benchmarkStartMsg:
		if !m.running {
			m.running = true
			m.startTime = time.Now()
		}
		return m, nil

	case benchmarkEventMsg:
		event := bridge.BenchmarkEvent(msg)
		m.handleEvent(event)
		// Wait for next event
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
		}
	}

	return m, m.tickCmd()
}

func (m BenchmarkModel) View() string {
	// Calculate content height to ensure it fits
	headerHeight := 5
	progressHeight := 6
	testsHeight := len(m.testOrder) + 4
	statsHeight := 4
	helpHeight := 2

	totalNeeded := headerHeight + progressHeight + testsHeight + statsHeight + helpHeight

	// Adjust if needed
	maxTestsShown := len(m.testOrder)
	if totalNeeded > m.height && m.height > 20 {
		maxTestsShown = m.height - (headerHeight + progressHeight + statsHeight + helpHeight + 4)
		if maxTestsShown < 3 {
			maxTestsShown = 3
		}
	}

	var sections []string

	// Header - compact
	mode := "Sequential"
	if m.state.Parallel {
		mode = "Parallel"
	}

	title := lipgloss.NewStyle().
		Bold(true).
		Foreground(styles.OrangePrimary).
		Render("🔥 BENCHMARK RUNNING")

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

		if m.currentCount > 0 && m.currentCount < m.totalSamples {
			avgPerSample := elapsed.Seconds() / float64(m.currentCount)
			remainingSamples := m.totalSamples - m.currentCount
			remainingSeconds := int(avgPerSample * float64(remainingSamples))
			remaining := formatDuration(time.Duration(remainingSeconds) * time.Second)
			stats = fmt.Sprintf("⏱ %s Elapsed • %s Remaining", elapsedStr, remaining)
		} else {
			stats = fmt.Sprintf("⏱ %s Elapsed", elapsedStr)
		}
	} else {
		stats = "⏱ Starting..."
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
			Render("❌ Error: "+m.state.Error))
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
		icon = "⏸"
		iconColor = styles.OrangeWarning
	case StatusFailed:
		icon = "✗"
		iconColor = styles.OrangeError
	default:
		icon = "○"
		iconColor = styles.GrayDim
	}

	iconStyled := lipgloss.NewStyle().Foreground(iconColor).Bold(true).Render(icon)

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
		Foreground(styles.OrangeLight).
		Render(fmt.Sprintf("%2d/%d", test.Current, test.Total))

	// Status or result
	statusText := ""
	if test.Status == StatusCompleted && test.PassAtOne > 0 {
		passColor := styles.OrangeSuccess
		if test.PassAtOne < 0.5 {
			passColor = styles.OrangeError
		} else if test.PassAtOne < 0.7 {
			passColor = styles.OrangeWarning
		}
		statusText = lipgloss.NewStyle().
			Foreground(passColor).
			Render(fmt.Sprintf("%.2f", test.PassAtOne))
	}

	return fmt.Sprintf(" %s %s %s %s  %s", iconStyled, name, miniBar, progressText, statusText)
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
			// Only increment currentCount if this is a new sample
			if event.Sample > test.Current {
				m.currentCount++
			}
			test.Current = event.Sample
		}

	case bridge.EventTestComplete:
		if test, ok := m.tests[event.Test]; ok {
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

func (m BenchmarkModel) runBenchmark() tea.Cmd {
	return func() tea.Msg {
		// EMERGENCY DEBUG: Write that runBenchmark was called
		if debugFile, err := os.Create("/tmp/tui-runbenchmark-called.txt"); err == nil {
			fmt.Fprintf(debugFile, "runBenchmark() tea.Cmd was called\n")
			fmt.Fprintf(debugFile, "Provider: '%s'\n", m.state.Provider)
			fmt.Fprintf(debugFile, "Model: '%s'\n", m.state.Model)
			debugFile.Close()
		}

		// Start the actual TypeScript benchmark in a goroutine
		go func() {
			// EMERGENCY DEBUG: Write that goroutine started
			if debugFile, err := os.Create("/tmp/tui-goroutine-started.txt"); err == nil {
				fmt.Fprintf(debugFile, "Goroutine started\n")
				debugFile.Close()
			}

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

			// EMERGENCY DEBUG: Write config to file before running
			if debugFile, err := os.Create("/tmp/tui-benchmark-config.txt"); err == nil {
				fmt.Fprintf(debugFile, "Provider: '%s'\n", config.Provider)
				fmt.Fprintf(debugFile, "Model: '%s'\n", config.Model)
				fmt.Fprintf(debugFile, "Parallel: %v\n", config.Parallel)
				fmt.Fprintf(debugFile, "Samples: %d\n", config.Samples)
				fmt.Fprintf(debugFile, "API Keys count: %d\n", len(config.APIKeys))
				debugFile.Close()
			}

			// Run benchmark and handle events
			err := bridge.RunBenchmark(config, func(event bridge.BenchmarkEvent) {
				// Send events to the channel for the Update loop
				select {
				case m.eventChan <- event:
				default:
					// Channel full, skip event
				}
			})

			// Send error event if benchmark failed
			if err != nil {
				select {
				case m.eventChan <- bridge.BenchmarkEvent{
					Type:  bridge.EventError,
					Error: err.Error(),
				}:
				default:
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
