package bridge

import "strings"

func anthropicModelsStatic() []Model {
	return []Model{
		{ID: "claude-sonnet-4-5-20250929", Name: "Claude Sonnet 4.5", Description: "Latest flagship", IsPopular: true},
		{ID: "claude-3-7-sonnet-20250219", Name: "Claude 3.7 Sonnet", Description: "Extended context", IsPopular: true},
		{ID: "claude-3-5-sonnet-20241022", Name: "Claude 3.5 Sonnet", Description: "Balanced", IsPopular: true},
		{ID: "claude-3-5-haiku-20241022", Name: "Claude 3.5 Haiku", Description: "Fast", IsPopular: true},
		{ID: "claude-3-opus-20240229", Name: "Claude 3 Opus", Description: "Powerful"},
		{ID: "claude-3-haiku-20240307", Name: "Claude 3 Haiku", Description: "Efficient"},
	}
}

func googleModelsStatic() []Model {
	return []Model{
		{ID: "gemini-2.0-flash-exp", Name: "Gemini 2.0 Flash", Description: "Latest experimental", IsPopular: true},
		{ID: "gemini-2.0-flash-thinking-exp", Name: "Gemini 2.0 Flash Thinking", Description: "Advanced reasoning", IsPopular: true},
		{ID: "gemini-exp-1206", Name: "Gemini Exp 1206", Description: "Experimental December", IsPopular: true},
		{ID: "gemini-1.5-pro", Name: "Gemini 1.5 Pro", Description: "Most capable", IsPopular: true},
		{ID: "gemini-1.5-flash", Name: "Gemini 1.5 Flash", Description: "Fast and efficient", IsPopular: true},
		{ID: "gemini-1.5-flash-8b", Name: "Gemini 1.5 Flash 8B", Description: "Smaller and faster"},
	}
}

func moonshotModelsStatic() []Model {
	return []Model{
		{ID: "moonshot-v1-8k", Name: "Moonshot v1 8K", Description: "8K context", IsPopular: true},
		{ID: "moonshot-v1-32k", Name: "Moonshot v1 32K", Description: "32K context", IsPopular: true},
		{ID: "moonshot-v1-128k", Name: "Moonshot v1 128K", Description: "128K context"},
	}
}

func fireworksModelsStatic() []Model {
	return []Model{
		{ID: "accounts/fireworks/models/llama-v3p3-70b-instruct", Name: "Llama 3.3 70B", Description: "Latest Llama", IsPopular: true},
		{ID: "accounts/fireworks/models/qwen2p5-72b-instruct", Name: "Qwen 2.5 72B", Description: "Qwen latest", IsPopular: true},
		{ID: "accounts/fireworks/models/mixtral-8x22b-instruct", Name: "Mixtral 8x22B", Description: "MoE model"},
	}
}

func zAIModelsStatic() []Model {
	ids := []string{"glm-4.5", "glm-4.5-air", "glm-4.5-x", "glm-4.5-airx", "glm-4.5-flash", "glm-4-32b-0414-128k"}
	models := make([]Model, len(ids))
	for i, id := range ids {
		models[i] = Model{ID: id, Description: zAIModelDescription(id)}
	}
	return models
}

func openAIDescription(modelID string) string {
	descriptions := map[string]string{
		"gpt-4o": "Latest GPT-4 Omni", "gpt-4o-mini": "Fast & efficient GPT-4",
		"gpt-4-turbo": "GPT-4 Turbo", "o1-preview": "Reasoning model (preview)",
		"o1-mini": "Fast reasoning model", "gpt-3.5-turbo": "Fast & affordable",
	}
	if description, ok := descriptions[modelID]; ok {
		return description
	}
	if strings.Contains(modelID, "gpt-4o") {
		return "GPT-4 Omni snapshot"
	}
	return ""
}

func zAIModelDescription(modelID string) string {
	descriptions := map[string]string{
		"glm-4.5": "GLM-4.5 flagship model", "glm-4.5-air": "GLM-4.5 Air (lightweight)",
		"glm-4.5-x": "GLM-4.5 X (extended)", "glm-4.5-airx": "GLM-4.5 AirX",
		"glm-4.5-flash": "GLM-4.5 Flash (fastest)", "glm-4-32b-0414-128k": "GLM-4 32B (128k context)",
	}
	if description, ok := descriptions[modelID]; ok {
		return description
	}
	if strings.Contains(modelID, "glm-4.5") {
		return "GLM-4.5 model"
	}
	if strings.Contains(modelID, "glm-4") {
		return "GLM-4 model"
	}
	return ""
}
