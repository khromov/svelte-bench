package bridge

import (
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestTinkerDiscovery(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		status     int
		wantError  bool
	}{
		{"catalog", `[{"tinker_id":"model","name":"Model","context":"64K","release_date":"2025-10-01"},{"tinker_id":"model:peft:262144","created":1759276800},{"tinker_id":"future","release_date":"2099-01-01"},{"tinker_id":"bad","release_date":"invalid"},{"tinker_id":""}]`, 200, false},
		{"empty", `[]`, 200, true}, {"malformed", `{}`, 200, true}, {"failure", `{}`, 503, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			delete(modelCache, "TM_TINKER_API_KEY")
			t.Cleanup(func() { delete(modelCache, "TM_TINKER_API_KEY") })
			original := http.DefaultTransport
			t.Cleanup(func() { http.DefaultTransport = original })
			calls := 0
			http.DefaultTransport = modelRoundTripFunc(func(r *http.Request) (*http.Response, error) {
				calls++
				if r.Method != http.MethodGet || r.URL.Host != "tinker-docs.thinkingmachines.ai" {
					t.Errorf("unexpected request: %s %s", r.Method, r.URL)
				}
				if r.Header.Get("Authorization") != "" {
					t.Error("API key leaked to public catalog")
				}
				body := tc.body
				if r.URL.Path == "/tinker/serverless.json" && tc.name == "catalog" {
					body = `[{"tinker_id":"model"},{"tinker_id":"model:sampling-nvfp4","context":"256K"}]`
				} else if r.URL.Path != "/tinker/models.json" && r.URL.Path != "/tinker/serverless.json" {
					t.Errorf("unexpected path: %s", r.URL.Path)
				}
				return &http.Response{StatusCode: tc.status, Body: io.NopCloser(strings.NewReader(body))}, nil
			})
			models, err := FetchModels("TM_TINKER_API_KEY", "secret-key")
			if (err != nil) != tc.wantError {
				t.Fatalf("models=%#v error=%v", models, err)
			}
			if tc.wantError {
				return
			}
			if len(models) != 5 || models[0].ID != "model" || models[0].AddedAt.Format("2006-01-02") != "2025-10-01" {
				t.Fatalf("unexpected models: %#v", models)
			}
			for _, m := range models[1:] {
				if !m.AddedAt.IsZero() {
					t.Errorf("invented release date for %s", m.ID)
				}
			}
			if calls != 2 {
				t.Fatalf("wanted both catalogs, got %d calls", calls)
			}
			if _, err := FetchModels("TM_TINKER_API_KEY", "secret-key"); err != nil || calls != 2 {
				t.Fatal("catalog was not cached")
			}
		})
	}
}
func TestTinkerProviderMapping(t *testing.T) {
	if got := ConvertProviderNameToEnvKey("Thinking Machines Tinker"); got != "tinker" {
		t.Fatalf("unexpected provider %q", got)
	}
}
