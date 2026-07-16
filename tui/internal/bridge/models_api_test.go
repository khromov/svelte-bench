package bridge

import "testing"

func TestFetchMoonshotModelsUsesOpenAICompatibleResponse(t *testing.T) {
	models, err := parseMoonshotModels([]byte(`{"data":[{"id":"kimi-k2.5","object":"model","owned_by":"moonshot"},{"id":"moonshot-v1-128k"}]}`))
	if err != nil {
		t.Fatalf("parseMoonshotModels returned error: %v", err)
	}
	if len(models) != 2 || models[0].ID != "kimi-k2.5" || models[1].ID != "moonshot-v1-128k" {
		t.Fatalf("unexpected models: %#v", models)
	}
}

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
