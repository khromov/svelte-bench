package styles

import (
	"fmt"
	"math"

	"github.com/charmbracelet/lipgloss"
	"github.com/lucasb-eyer/go-colorful"
)

// GradientType defines different gradient styles
type GradientType int

const (
	PrimaryGradient GradientType = iota
	SuccessGradient
	ErrorGradient
	ProgressGradient
)

// CreateGradient creates a color gradient string
func CreateGradient(text string, gradientType GradientType) string {
	var startColor, endColor colorful.Color

	switch gradientType {
	case PrimaryGradient:
		startColor, _ = colorful.Hex("#FF6B35")
		endColor, _ = colorful.Hex("#FFA500")
	case SuccessGradient:
		startColor, _ = colorful.Hex("#4ADE80")
		endColor, _ = colorful.Hex("#FF8C42")
	case ErrorGradient:
		startColor, _ = colorful.Hex("#EF4444")
		endColor, _ = colorful.Hex("#FF6B35")
	case ProgressGradient:
		startColor, _ = colorful.Hex("#FF6B35")
		endColor, _ = colorful.Hex("#FFA500")
	default:
		startColor, _ = colorful.Hex("#FF6B35")
		endColor, _ = colorful.Hex("#FFA500")
	}

	result := ""
	length := len([]rune(text))

	for i, char := range text {
		ratio := float64(i) / math.Max(float64(length-1), 1)
		color := startColor.BlendLuv(endColor, ratio)
		hexColor := color.Hex()
		result += lipgloss.NewStyle().Foreground(lipgloss.Color(hexColor)).Render(string(char))
	}

	return result
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
			// Create gradient effect in filled portion
			ratio := float64(i) / math.Max(float64(filled-1), 1)
			startColor, _ := colorful.Hex("#FF6B35")
			endColor, _ := colorful.Hex("#FFA500")
			color := startColor.BlendLuv(endColor, ratio)
			hexColor := color.Hex()
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

	// Moving highlight position (bounces back and forth)
	highlightSpeed := 3
	highlightPos := 0
	if filled > 0 {
		cycle := filled * 2
		if cycle > 0 {
			highlightPos = (frame / highlightSpeed) % cycle
			if highlightPos >= filled {
				highlightPos = cycle - highlightPos - 1
			}
		}
	}

	bar := ""
	for i := 0; i < width; i++ {
		if i < filled {
			// Check if this is the highlight position
			isHighlight := i == highlightPos || i == highlightPos-1

			if isHighlight && filled > 2 {
				// Yellow highlight
				bar += lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFF00")).Bold(true).Render("█")
			} else {
				// Orange gradient
				ratio := float64(i) / math.Max(float64(filled-1), 1)
				startColor, _ := colorful.Hex("#FF6B35")
				endColor, _ := colorful.Hex("#FFA500")
				color := startColor.BlendLuv(endColor, ratio)
				hexColor := color.Hex()
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
	return bar + lipgloss.NewStyle().Foreground(OrangePrimary).Bold(true).Render(percentText)
}

// AnimatedBorderColor returns a color for animated border based on frame number
func AnimatedBorderColor(frame int) lipgloss.Color {
	colors := []lipgloss.Color{
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
