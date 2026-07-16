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

func TestOpenAICompatibleModelParsingKeepsCurrentModelFamilies(t *testing.T) {
	models, err := parseOpenAICompatibleModels([]byte(`{"data":[{"id":"deepseek-v4-flash"},{"id":"grok-4.5"},{"id":"muse-spark-1.1"}]}`))
	if err != nil {
		t.Fatalf("parseOpenAICompatibleModels returned error: %v", err)
	}
	if len(models) != 3 || models[0].ID != "deepseek-v4-flash" || models[1].ID != "grok-4.5" || models[2].ID != "muse-spark-1.1" {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestXAIModelParsingUsesLanguageModelResponseShape(t *testing.T) {
	models, err := parseXAIModels([]byte(`{"models":[{"id":"grok-4.5","input_modalities":["text","image"],"output_modalities":["text"]},{"id":"grok-imagine-image","input_modalities":["text"],"output_modalities":["image"]}]}`))
	if err != nil {
		t.Fatalf("parseXAIModels returned error: %v", err)
	}
	if len(models) != 1 || models[0].ID != "grok-4.5" {
		t.Fatalf("unexpected models: %#v", models)
	}
}

func TestIsOpenAIChatModelIncludesNewReasoningFamilies(t *testing.T) {
	for _, modelID := range []string{"gpt-5.4", "o3", "o4-mini", "chatgpt-4o-latest", "ft:gpt-4o:org:custom"} {
		if !isOpenAIChatModel(modelID) {
			t.Errorf("expected %q to be discoverable", modelID)
		}
	}
	for _, modelID := range []string{"text-embedding-3-large", "omni-moderation-latest", "gpt-image-1"} {
		if isOpenAIChatModel(modelID) {
			t.Errorf("expected %q to be excluded", modelID)
		}
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
