package styles

import (
	"charm.land/lipgloss/v2"
)

// Orange color palette
var (
	OrangePrimary = lipgloss.Color("#FF6B35")
	OrangeMid     = lipgloss.Color("#FF8C42")
	OrangeLight   = lipgloss.Color("#FFA500")
	OrangeDark    = lipgloss.Color("#FF4500")

	OrangeSuccess = lipgloss.Color("#F6C85F") // Warm yellow for successful results
	OrangeError   = lipgloss.Color("#F85149") // Red for errors
	OrangeWarning = lipgloss.Color("#D29922") // Yellow for warnings

	GrayDim    = lipgloss.Color("#6B7280")
	GrayMedium = lipgloss.Color("#9CA3AF")
	GrayLight  = lipgloss.Color("#D1D5DB")
	White      = lipgloss.Color("#FFFFFF")
	Black      = lipgloss.Color("#000000")

	BgDark   = lipgloss.Color("#0A0A0A")
	BgMedium = lipgloss.Color("#1A1A1A")
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

	// HeadingStyle is used for every screen heading so the TUI has one visual hierarchy.
	HeadingStyle = lipgloss.NewStyle().
			Foreground(OrangePrimary).
			Bold(true)

	SectionLabelStyle = lipgloss.NewStyle().
				Foreground(GrayDim).
				Bold(true)

	SelectedRowStyle = lipgloss.NewStyle().
				Background(BgMedium).
				Foreground(White).
				Bold(true)

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
)

// Center centers text within a given width
func Center(s string, width int) string {
	return lipgloss.Place(width, 1, lipgloss.Center, lipgloss.Center, s)
}
