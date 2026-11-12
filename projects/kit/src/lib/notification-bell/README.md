# Notification bell

`<kit-notification-bell>`: a bell in the top bar with the count of what arrived since the user last looked;
opened, the list of it; a tap opens one.

## Rules

- **The count is a badge** (99+ past 99); the bell rings (`notifications_active`) when there is something.
- **What the open menu lists stays as it was when it opened**, so it does not change under the finger while
  the page marks it seen.
- **Opening marks it seen** (the page does it, on `opened`).
- **Hidden** while notifications are off, and when the list cannot be read (the page's `@if`).
- Each row: what it is and when it arrived on a small line, then its title on up to two lines.

## API

| | Name | Type | Default |
| --- | --- | --- | --- |
| input | `items` | `KitNotification[]` (`{ id, title, meta?, when?, link? }`) | required |
| input | `noun` | `string` | `'notifications'` ("3 new tickets") |
| input | `emptyText` | `string` | `'Nothing new.'` |
| output | `opened` | `KitNotification[]` | what it showed |
| output | `selected` | `KitNotification` | an item without a link |

## Origin

vtiger-reader `ui/bell` (its loading and marking stay in the app).
