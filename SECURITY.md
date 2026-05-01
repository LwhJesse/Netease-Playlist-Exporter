# Security Policy

## Credentials

This project may store NetEase Cloud Music login state in:

```text
.state/cookie.txt
```

This file may contain `MUSIC_U`, which is a login credential.

Never share:

```text
.state/cookie.txt
MUSIC_U
full API logs containing cookie parameters
```

The project already ignores `.state/` in `.gitignore`.

## Reporting security issues

If you find a security issue, please open a GitHub issue with sensitive details removed.

Do not include private cookies, tokens, account IDs, or full request URLs containing credentials.
