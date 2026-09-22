package bridge

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRunBenchmarkReportsCommandStderr(t *testing.T) {
	binDir := t.TempDir()
	pnpmPath := filepath.Join(binDir, "pnpm")
	if err := os.WriteFile(pnpmPath, []byte("#!/bin/sh\nprintf 'Anthropic validation failed: invalid model\\n' >&2\nexit 1\n"), 0700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))

	for range 10 {
		err := RunBenchmark(BenchmarkConfig{Provider: "anthropic", Model: "test-model", Samples: 1}, nil)
		if err == nil || !strings.Contains(err.Error(), "Anthropic validation failed: invalid model") {
			t.Fatalf("expected command stderr in benchmark error, got %v", err)
		}
	}
}

func TestDebugLogEnabled(t *testing.T) {
	t.Setenv(debugLogEnv, "")
	if debugLogEnabled() {
		t.Fatal("expected debug logging to be disabled by default")
	}

	for _, value := range []string{"true", "TRUE", "1"} {
		t.Setenv(debugLogEnv, value)
		if !debugLogEnabled() {
			t.Fatalf("expected %q to enable debug logging", value)
		}
	}

	for _, value := range []string{"false", "0", "no"} {
		t.Setenv(debugLogEnv, value)
		if debugLogEnabled() {
			t.Fatalf("expected %q to disable debug logging", value)
		}
	}
}

func TestBuildBenchmarkEnvReplacesInheritedValues(t *testing.T) {
	env := buildBenchmarkEnv(
		[]string{"OPENAI_API_KEY=old", "PATH=/bin", "PARALLEL_EXECUTION=true"},
		BenchmarkConfig{
			Provider: "openai",
			Model:    "gpt-4o-mini",
			APIKeys:  map[string]string{"OPENAI_API_KEY": "new"},
			Samples:  1,
		},
	)

	values := make(map[string]string)
	for _, entry := range env {
		for i := 0; i < len(entry); i++ {
			if entry[i] == '=' {
				values[entry[:i]] = entry[i+1:]
				break
			}
		}
	}

	if values["OPENAI_API_KEY"] != "new" {
		t.Fatalf("expected selected API key, got %q", values["OPENAI_API_KEY"])
	}
	if _, ok := values["PARALLEL_EXECUTION"]; ok {
		t.Fatal("expected sequential mode to remove inherited parallel flag")
	}
	if _, ok := values["MADMAX_EXECUTION"]; ok {
		t.Fatal("expected sequential mode to remove inherited madmax flag")
	}
	if values["TUI_MODE"] != "true" || values["DEBUG_MODE"] != "true" {
		t.Fatal("expected TUI debug environment to be set")
	}
}

func TestBuildBenchmarkEnvEnablesMadmaxOnly(t *testing.T) {
	env := buildBenchmarkEnv(
		[]string{"PARALLEL_EXECUTION=true"},
		BenchmarkConfig{Madmax: true, Samples: 10},
	)

	values := make(map[string]string)
	for _, entry := range env {
		if key, value, ok := strings.Cut(entry, "="); ok {
			values[key] = value
		}
	}

	if values["MADMAX_EXECUTION"] != "true" {
		t.Fatal("expected madmax mode to be enabled")
	}
	if _, ok := values["PARALLEL_EXECUTION"]; ok {
		t.Fatal("expected madmax mode to remove parallel flag")
	}
}
