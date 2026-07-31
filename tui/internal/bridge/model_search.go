package bridge

import (
	"sort"
	"strings"

	"github.com/sahilm/fuzzy"
)

// FuzzySearch returns models ordered by relevance. Exact ID/token matches are
// intentionally weighted above fuzzy similarity so a query like "14b" cannot
// be outranked by a nearby but incorrect size such as "24b".
func FuzzySearch(models []Model, query string) []Model {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return models
	}

	queryTokens := searchTokens(query)
	type scoredModel struct {
		model Model
		score int
		index int
	}
	scored := make([]scoredModel, 0, len(models))

	for index, model := range models {
		id := strings.ToLower(model.ID)
		description := strings.ToLower(model.Description)
		match := fuzzy.Find(query, []string{id + " " + description})
		if len(match) == 0 {
			continue
		}

		score := match[0].Score
		if id == query {
			score += 10000
		} else if strings.Contains(id, query) {
			score += 5000
		}
		if strings.HasPrefix(id, query) {
			score += 1500
		}

		idTokens := searchTokens(id)
		for _, token := range queryTokens {
			if containsSearchToken(idTokens, token) {
				score += 4000
			} else if strings.Contains(id, token) {
				score += 1000
			} else if containsSearchToken(searchTokens(description), token) {
				score += 250
			}
		}

		score -= len(id) / 20
		scored = append(scored, scoredModel{model: model, score: score, index: index})
	}

	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].score == scored[j].score {
			return scored[i].index < scored[j].index
		}
		return scored[i].score > scored[j].score
	})

	result := make([]Model, len(scored))
	for i, candidate := range scored {
		result[i] = candidate.model
	}
	return result
}

func searchTokens(value string) []string {
	return strings.FieldsFunc(value, func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	})
}

func containsSearchToken(tokens []string, query string) bool {
	for _, token := range tokens {
		if token == query {
			return true
		}
	}
	return false
}
