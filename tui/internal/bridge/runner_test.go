package bridge

import (
	"strings"
	"testing"
)

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
