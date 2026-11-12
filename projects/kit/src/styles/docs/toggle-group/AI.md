# AI notes: Toggle groups

- Always `hideSingleSelectionIndicator` and an `aria-label` saying what is chosen.
- Labels are whole words, lowercase like the rest of substance-tracker's toggles unless the app says
  otherwise.
- Do not set heights, paddings or radii on toggles: the kit sets them globally.
- On a phone, a group with long labels can wrap: give it `flex-wrap: wrap; max-width: 100%` rather than
  shortening the words.
