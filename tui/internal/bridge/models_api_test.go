package bridge

import "testing"

func TestFuzzySearchRanksExactModelSizeAheadOfNearbySizes(t *testing.T) {
	models := []Model{
		{ID: "qwen/qwen2.5-24b-instruct"},
		{ID: "qwen/qwen2.5-14b-instruct"},
		{ID: "qwen/qwen2.5-7b-instruct"},
	}

	results := FuzzySearch(models, "14b")
	if len(results) == 0 || results[0].ID != "qwen/qwen2.5-14b-instruct" {
		t.Fatalf("expected exact 14b model first, got %#v", results)
	}
}

func TestFuzzySearchPrefersModelIDMatchesOverDescriptionMatches(t *testing.T) {
	models := []Model{
		{ID: "provider/large-model", Description: "optimized for 14b workloads"},
		{ID: "provider/14b-model", Description: "general purpose"},
	}

	results := FuzzySearch(models, "14b")
	if len(results) == 0 || results[0].ID != "provider/14b-model" {
		t.Fatalf("expected ID match first, got %#v", results)
	}
}
