# AI notes: Navigation list

- Inside `KitAppShell` with the attribute `kitShellNav`.
- Every page of the app is an entry with a Material icon and a whole-word label. Settings and sign out go
  in `bottom`, settings last.
- Never put counts, badges, user data (beyond the subtitle) or nested groups in it.
- Sign out: a button entry (`id: 'sign-out'`), and `(pressed)` → `KitDialogs.open(KitConfirmDialog, …)`,
  `destructive: false`, then navigate to the sign-in page.
