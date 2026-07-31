package models

import "testing"

func TestMoveListSelectionWrapsShortLists(t *testing.T) {
	selected, offset := moveListSelection(0, 8, -1, 0, 5)
	if selected != 7 || offset != 3 {
		t.Fatalf("up from first item should wrap to final visible window, got selected=%d offset=%d", selected, offset)
	}

	selected, offset = moveListSelection(7, 8, 1, 3, 5)
	if selected != 0 || offset != 0 {
		t.Fatalf("down from final item should wrap to first item, got selected=%d offset=%d", selected, offset)
	}
}

func TestMoveListSelectionScrollsWithoutWrappingLongLists(t *testing.T) {
	selected, offset := moveListSelection(24, wrapNavigationLimit, 1, 20, 5)
	if selected != 24 || offset != 20 {
		t.Fatalf("long lists should stop at the final item, got selected=%d offset=%d", selected, offset)
	}

	selected, offset = moveListSelection(4, wrapNavigationLimit, 1, 0, 5)
	if selected != 5 || offset != 1 {
		t.Fatalf("moving below the visible window should scroll once, got selected=%d offset=%d", selected, offset)
	}
}
