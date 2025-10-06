package styles

import (
	"github.com/charmbracelet/lipgloss"
)

// Orange color palette
var (
	OrangePrimary   = lipgloss.Color("#FF6B35")
	OrangeMid       = lipgloss.Color("#FF8C42")
	OrangeLight     = lipgloss.Color("#FFA500")
	OrangeDark      = lipgloss.Color("#FF4500")

	OrangeSuccess   = lipgloss.Color("#FFB366") // Lighter orange for success
	OrangeError     = lipgloss.Color("#FF4500") // Darker red-orange for errors
	OrangeWarning   = lipgloss.Color("#FFA500") // Yellow-orange for warnings

	GrayDim         = lipgloss.Color("#6B7280")
	GrayMedium      = lipgloss.Color("#9CA3AF")
	GrayLight       = lipgloss.Color("#D1D5DB")
	White           = lipgloss.Color("#FFFFFF")
	Black           = lipgloss.Color("#000000")

	BgDark          = lipgloss.Color("#0A0A0A")
	BgMedium        = lipgloss.Color("#1A1A1A")
)

// Base styles
var (
	// Title style - large centered text with orange gradient
	TitleStyle = lipgloss.NewStyle().
		Foreground(OrangePrimary).
		Bold(true).
		Align(lipgloss.Center).
		MarginTop(2).
		MarginBottom(1)

	// Subtitle style
	SubtitleStyle = lipgloss.NewStyle().
		Foreground(GrayMedium).
		Align(lipgloss.Center).
		MarginBottom(2)

	// Header box style
	HeaderBoxStyle = lipgloss.NewStyle().
		Border(lipgloss.DoubleBorder()).
		BorderForeground(OrangePrimary).
		Padding(0, 2).
		Align(lipgloss.Center).
		MarginBottom(2)

	// Card styles - for option selections
	CardStyle = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(GrayMedium).
		Padding(1, 2).
		MarginBottom(1)

	CardSelectedStyle = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(OrangePrimary).
		Padding(1, 2).
		MarginBottom(1).
		Bold(true)

	// Large card for mode selection
	LargeCardStyle = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(GrayMedium).
		Padding(2, 4).
		MarginBottom(2).
		Width(50).
		Align(lipgloss.Center)

	LargeCardSelectedStyle = lipgloss.NewStyle().
		Border(lipgloss.ThickBorder()).
		BorderForeground(OrangePrimary).
		Padding(2, 4).
		MarginBottom(2).
		Width(50).
		Align(lipgloss.Center).
		Bold(true)

	// Input field style
	InputStyle = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(GrayMedium).
		Padding(0, 1).
		Width(40)

	InputFocusedStyle = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(OrangePrimary).
		Padding(0, 1).
		Width(40)

	// Help text style
	HelpStyle = lipgloss.NewStyle().
		Foreground(GrayMedium).
		Align(lipgloss.Center).
		MarginTop(2)

	// Status text styles
	SuccessStyle = lipgloss.NewStyle().
		Foreground(OrangeSuccess).
		Bold(true)

	ErrorStyle = lipgloss.NewStyle().
		Foreground(OrangeError).
		Bold(true)

	WarningStyle = lipgloss.NewStyle().
		Foreground(OrangeWarning)

	// Progress text
	ProgressTextStyle = lipgloss.NewStyle().
		Foreground(OrangePrimary).
		Bold(true)

	// Stats bar at bottom
	StatsBarStyle = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(OrangeMid).
		Padding(0, 2).
		MarginTop(2)
)

// GetCardStyle returns the appropriate card style based on selection
func GetCardStyle(selected bool, large bool) lipgloss.Style {
	if large {
		if selected {
			return LargeCardSelectedStyle
		}
		return LargeCardStyle
	}
	if selected {
		return CardSelectedStyle
	}
	return CardStyle
}

// Center centers text within a given width
func Center(s string, width int) string {
	return lipgloss.Place(width, 1, lipgloss.Center, lipgloss.Center, s)
}
