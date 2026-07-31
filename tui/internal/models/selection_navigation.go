package models

const wrapNavigationLimit = 25

func moveListSelection(current, count, direction, offset, visible int) (int, int) {
	if count == 0 {
		return 0, 0
	}

	if direction < 0 {
		if current == 0 && count < wrapNavigationLimit {
			current = count - 1
			offset = max(0, count-visible)
		} else if current > 0 {
			current--
			if current < offset {
				offset = current
			}
		}
		return current, offset
	}

	if current == count-1 && count < wrapNavigationLimit {
		return 0, 0
	}
	if current < count-1 {
		current++
		if current >= offset+visible {
			offset = current - visible + 1
		}
	}
	return current, offset
}
