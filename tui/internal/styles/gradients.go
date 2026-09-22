package styles

import (
	"fmt"
	"image/color"
	"math"
	"strings"

	"charm.land/lipgloss/v2"
	"github.com/lucasb-eyer/go-colorful"
)

// GradientType defines different gradient styles
type GradientType int

const (
	PrimaryGradient GradientType = iota
	AccentGradient
	SuccessGradient
	ErrorGradient
	ProgressGradient
)

// gradientColors keeps all text gradients in the same warm Svelte-inspired
// palette. In particular, success colors stay gold instead of introducing a
// green accent that clashes with the rest of the interface.
func gradientColors(gradientType GradientType) (colorful.Color, colorful.Color) {
	var startHex, endHex string
	switch gradientType {
	case PrimaryGradient:
		startHex, endHex = "#FF3E00", "#FFB347"
	case AccentGradient:
		startHex, endHex = "#FF7A3D", "#F59E0B"
	case SuccessGradient:
		startHex, endHex = "#FFD166", "#FF8C42"
	case ErrorGradient:
		startHex, endHex = "#EF4444", "#FF6B35"
	case ProgressGradient:
		startHex, endHex = "#F4D06F", "#E88A3A"
	default:
		startHex, endHex = "#FF3E00", "#FFB347"
	}

	startColor, _ := colorful.Hex(startHex)
	endColor, _ := colorful.Hex(endHex)
	return startColor, endColor
}

// gradientColor returns a clamped point along one of the theme gradients.
func gradientColor(gradientType GradientType, ratio float64) colorful.Color {
	startColor, endColor := gradientColors(gradientType)
	ratio = math.Max(0, math.Min(1, ratio))
	return startColor.BlendLuv(endColor, ratio).Clamped()
}

// CreateGradient creates a color gradient string.
func CreateGradient(text string, gradientType GradientType) string {
	return createGradient(text, gradientType, false)
}

// CreateBoldGradient creates a bold color gradient string for headings and
// primary actions.
func CreateBoldGradient(text string, gradientType GradientType) string {
	return createGradient(text, gradientType, true)
}

func createGradient(text string, gradientType GradientType, bold bool) string {
	runes := []rune(text)
	var result strings.Builder

	for i, char := range runes {
		ratio := float64(i) / math.Max(float64(len(runes)-1), 1)
		style := lipgloss.NewStyle().
			Foreground(lipgloss.Color(gradientColor(gradientType, ratio).Hex())).
			Bold(bold)
		result.WriteString(style.Render(string(char)))
	}

	return result.String()
}

// RenderProgressBar creates an orange gradient progress bar
func RenderProgressBar(current, total, width int) string {
	if total == 0 {
		total = 1
	}

	percent := float64(current) / float64(total)
	filled := int(percent * float64(width))

	if filled > width {
		filled = width
	}

	bar := ""
	for i := 0; i < width; i++ {
		if i < filled {
			ratio := float64(i) / math.Max(float64(filled-1), 1)
			hexColor := gradientColor(ProgressGradient, ratio).Hex()
			bar += lipgloss.NewStyle().Foreground(lipgloss.Color(hexColor)).Render("█")
		} else {
			bar += lipgloss.NewStyle().Foreground(GrayDim).Render("░")
		}
	}

	return bar
}

// RenderAnimatedProgressBar renders an animated progress bar with moving yellow highlight
func RenderAnimatedProgressBar(current, total, width int, frame int) string {
	if total == 0 {
		total = 1
	}

	percent := float64(current) / float64(total)
	filled := int(percent * float64(width))

	if filled > width {
		filled = width
	}

	// Moving highlight position, like a subtle left-to-right marquee.
	highlightSpeed := 18
	highlightPos := 0
	if filled > 0 {
		highlightPos = (frame / highlightSpeed) % filled
	}

	bar := ""
	for i := 0; i < width; i++ {
		if i < filled {
			// Keep the activity pulse subtle and stable.
			isHighlight := i == highlightPos

			if isHighlight && filled > 2 {
				// Yellow highlight
				bar += lipgloss.NewStyle().Foreground(lipgloss.Color("#F9D98C")).Render("█")
			} else {
				ratio := float64(i) / math.Max(float64(filled-1), 1)
				hexColor := gradientColor(ProgressGradient, ratio).Hex()
				bar += lipgloss.NewStyle().Foreground(lipgloss.Color(hexColor)).Render("█")
			}
		} else {
			bar += lipgloss.NewStyle().Foreground(GrayDim).Render("░")
		}
	}

	return bar
}

// RenderProgressBarWithPercentage renders a progress bar with percentage
func RenderProgressBarWithPercentage(current, total, width int) string {
	if total == 0 {
		total = 1
	}

	percent := int((float64(current) / float64(total)) * 100)
	bar := RenderProgressBar(current, total, width)

	percentText := fmt.Sprintf(" %d%%", percent)
	return bar + CreateBoldGradient(percentText, ProgressGradient)
}

// AnimatedBorderColor returns a color for animated border based on frame number
func AnimatedBorderColor(frame int) color.Color {
	colors := []color.Color{
		OrangePrimary,
		OrangeMid,
		OrangeLight,
		OrangeMid,
	}

	index := frame % len(colors)
	return colors[index]
}

// RenderGlowBox creates a box with a subtle orange glow effect
func RenderGlowBox(content string, width, height int, selected bool) string {
	style := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		Padding(1, 2).
		Width(width).
		Height(height).
		Align(lipgloss.Center, lipgloss.Center)

	if selected {
		style = style.BorderForeground(OrangePrimary).Bold(true)
	} else {
		style = style.BorderForeground(GrayMedium)
	}

	return style.Render(content)
}
