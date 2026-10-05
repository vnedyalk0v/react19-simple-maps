---
'@vnedyalk0v/react19-simple-maps': patch
---

Keep geography error fallbacks and retry controls working when children throw a value other than an Error. Error callbacks now consistently receive an Error, while existing Error objects retain their identity.
