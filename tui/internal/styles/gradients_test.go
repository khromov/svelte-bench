package styles

import (
	"image/color"
	"strings"
	"testing"
)

func TestThemeGradientsStayWarm(t *testing.T) {
	t.Parallel()

	gradientTypes := []GradientType{
		PrimaryGradient,
		AccentGradient,
		SuccessGradient,
		ProgressGradient,
	}

	for _, gradientType := range gradientTypes {
		for step := 0; step <= 20; step++ {
			c := gradientColor(gradientType, float64(step)/20)
			r, g, b, _ := c.RGBA()
			if g > r || b > r {
				t.Fatalf("gradient %d introduced a non-warm color at step %d: %s", gradientType, step, c.Hex())
			}
		}
	}
}

func TestGradientColorClampsRatio(t *testing.T) {
	t.Parallel()

	start, end := gradientColors(PrimaryGradient)
	assertSameColor(t, gradientColor(PrimaryGradient, -1), start)
	assertSameColor(t, gradientColor(PrimaryGradient, 2), end)
}

func TestUnicodeGradientEndsAtPaletteEndpoint(t *testing.T) {
	t.Parallel()

	// The bullet is multibyte. Using range's byte offset as the interpolation
	// index used to push the final character beyond the end of the palette.
	rendered := CreateGradient("A•B", AccentGradient)
	if !strings.Contains(rendered, "\x1b[38;2;245;158;11mB") {
		t.Fatalf("final rune did not use the gradient endpoint: %q", rendered)
	}
}

func assertSameColor(t *testing.T, actual, expected color.Color) {
	t.Helper()
	ar, ag, ab, aa := actual.RGBA()
	er, eg, eb, ea := expected.RGBA()
	if ar != er || ag != eg || ab != eb || aa != ea {
		t.Fatalf("colors differ: got %#v, want %#v", actual, expected)
	}
}
