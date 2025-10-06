package bridge

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
)

// BenchmarkConfig holds the configuration for running a benchmark
type BenchmarkConfig struct {
	Provider     string
	Model        string
	APIKeys      map[string]string
	Parallel     bool
	Samples      int
	ContextFile  string
}

// RunBenchmark runs the TypeScript benchmark with the given configuration
func RunBenchmark(config BenchmarkConfig, eventHandler EventHandler) error {
	// Get project root
	projectRoot, err := getProjectRoot()
	if err != nil {
		return fmt.Errorf("failed to get project root: %w", err)
	}

	// Create debug log file
	debugLog, _ := os.Create(filepath.Join(projectRoot, "tui-debug.log"))
	if debugLog != nil {
		defer debugLog.Close()
		fmt.Fprintf(debugLog, "=== TUI Debug Log ===\n")
		fmt.Fprintf(debugLog, "Project root: %s\n", projectRoot)
		fmt.Fprintf(debugLog, "Provider: %s\n", config.Provider)
		fmt.Fprintf(debugLog, "Model: %s\n", config.Model)
		fmt.Fprintf(debugLog, "Samples: %d\n", config.Samples)
		fmt.Fprintf(debugLog, "Parallel: %v\n", config.Parallel)
	}

	// Build command
	cmd := exec.Command("pnpm", "run-tests")
	cmd.Dir = projectRoot

	if debugLog != nil {
		fmt.Fprintf(debugLog, "Command: pnpm run-tests\n")
		fmt.Fprintf(debugLog, "Working directory: %s\n\n", projectRoot)
	}

	// Set environment variables
	env := os.Environ()

	// Add API keys
	for key, value := range config.APIKeys {
		env = append(env, fmt.Sprintf("%s=%s", key, value))
		if debugLog != nil {
			// Don't log the actual key value, just that it was set
			fmt.Fprintf(debugLog, "ENV: %s=***\n", key)
		}
	}

	// Add TUI mode
	env = append(env, "TUI_MODE=true")
	if debugLog != nil {
		fmt.Fprintf(debugLog, "ENV: TUI_MODE=true\n")
	}

	// Add DEBUG_MODE settings
	env = append(env, "DEBUG_MODE=true")
	env = append(env, fmt.Sprintf("DEBUG_PROVIDER=%s", config.Provider))
	env = append(env, fmt.Sprintf("DEBUG_MODEL=%s", config.Model))
	env = append(env, fmt.Sprintf("DEBUG_SAMPLES=%d", config.Samples))

	if debugLog != nil {
		fmt.Fprintf(debugLog, "ENV: DEBUG_MODE=true\n")
		fmt.Fprintf(debugLog, "ENV: DEBUG_PROVIDER=%s\n", config.Provider)
		fmt.Fprintf(debugLog, "ENV: DEBUG_MODEL=%s\n", config.Model)
		fmt.Fprintf(debugLog, "ENV: DEBUG_SAMPLES=%d\n", config.Samples)
	}

	// Add execution mode
	if config.Parallel {
		env = append(env, "PARALLEL_EXECUTION=true")
		if debugLog != nil {
			fmt.Fprintf(debugLog, "ENV: PARALLEL_EXECUTION=true\n")
		}
	}

	cmd.Env = env

	if debugLog != nil {
		fmt.Fprintf(debugLog, "\n=== Starting command ===\n")
	}

	// Get stdout pipe
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to get stdout pipe: %w", err)
	}

	// Get stderr pipe
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to get stderr pipe: %w", err)
	}

	// Start command
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start command: %w", err)
	}

	// Parse events from stdout in a goroutine
	eventChan := make(chan BenchmarkEvent, 100)
	errChan := make(chan error, 1)
	stderrChan := make(chan string, 1)

	go func() {
		err := ParseEventStream(io.NopCloser(stdout), func(event BenchmarkEvent) {
			eventChan <- event
		})
		if err != nil {
			errChan <- err
		}
		close(eventChan)
	}()

	// Capture stderr for debugging
	go func() {
		stderrBytes, _ := io.ReadAll(stderr)
		if len(stderrBytes) > 0 {
			stderrMsg := string(stderrBytes)
			stderrChan <- stderrMsg
			if debugLog != nil {
				fmt.Fprintf(debugLog, "\n=== STDERR ===\n%s\n", stderrMsg)
			}
		}
		close(stderrChan)
	}()

	// Handle events
	eventCount := 0
	for event := range eventChan {
		eventCount++
		if debugLog != nil && eventCount <= 10 {
			fmt.Fprintf(debugLog, "EVENT %d: Type=%s, Test=%s, Sample=%d, Total=%d\n",
				eventCount, event.Type, event.Test, event.Sample, event.Total)
		}
		if eventHandler != nil {
			eventHandler(event)
		}
	}

	if debugLog != nil {
		fmt.Fprintf(debugLog, "\n=== Command completed ===\n")
		fmt.Fprintf(debugLog, "Total events received: %d\n", eventCount)
	}

	// Wait for command to finish
	waitErr := cmd.Wait()

	if debugLog != nil {
		if waitErr != nil {
			fmt.Fprintf(debugLog, "Command wait error: %v\n", waitErr)
		} else {
			fmt.Fprintf(debugLog, "Command completed successfully\n")
		}
	}

	// Check for stderr output
	select {
	case stderrMsg := <-stderrChan:
		if waitErr != nil {
			return fmt.Errorf("command failed: %w\nstderr: %s", waitErr, stderrMsg)
		}
		// Log stderr even if command succeeded (warnings, etc.)
		if debugLog != nil && stderrMsg != "" {
			fmt.Fprintf(debugLog, "STDERR (non-fatal): %s\n", stderrMsg)
		}
	default:
	}

	if waitErr != nil {
		return fmt.Errorf("command failed: %w", waitErr)
	}

	// Check for parsing errors
	select {
	case err := <-errChan:
		return err
	default:
	}

	return nil
}

// GetAvailableTests returns a list of available test names
func GetAvailableTests() ([]string, error) {
	projectRoot, err := getProjectRoot()
	if err != nil {
		return nil, err
	}

	testsDir := filepath.Join(projectRoot, "src", "tests")

	entries, err := os.ReadDir(testsDir)
	if err != nil {
		return nil, err
	}

	tests := make([]string, 0)
	for _, entry := range entries {
		if entry.IsDir() {
			tests = append(tests, entry.Name())
		}
	}

	return tests, nil
}

// getProjectRoot finds the project root directory
func getProjectRoot() (string, error) {
	// Start from current directory
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// If we're in tui/, go up one level
	if filepath.Base(dir) == "tui" {
		return filepath.Dir(dir), nil
	}

	// Check if package.json exists
	if _, err := os.Stat(filepath.Join(dir, "package.json")); err == nil {
		return dir, nil
	}

	// Go up one level and check
	parent := filepath.Dir(dir)
	if _, err := os.Stat(filepath.Join(parent, "package.json")); err == nil {
		return parent, nil
	}

	return dir, nil
}

// FormatDuration formats a duration in seconds to a human-readable string
func FormatDuration(seconds int) string {
	if seconds < 60 {
		return fmt.Sprintf("%ds", seconds)
	}

	minutes := seconds / 60
	secs := seconds % 60

	if minutes < 60 {
		return fmt.Sprintf("%dm %ds", minutes, secs)
	}

	hours := minutes / 60
	mins := minutes % 60

	return fmt.Sprintf("%dh %dm", hours, mins)
}

// ConvertProviderNameToEnvKey converts a provider display name to its env key
func ConvertProviderNameToEnvKey(providerName string) string {
	mapping := map[string]string{
		"OpenAI":          "openai",
		"Anthropic":       "anthropic",
		"Google (Gemini)": "google",
		"OpenRouter":      "openrouter",
		"Groq":            "groq",
		"DeepSeek":        "deepseek",
		"xAI (Grok)":      "xai",
		"Mistral":         "mistral",
		"Cohere":          "cohere",
		"Fireworks":       "fireworks",
		"Moonshot":        "moonshot",
		"Z.ai":            "zai",
	}

	if key, ok := mapping[providerName]; ok {
		return key
	}

	return providerName
}
