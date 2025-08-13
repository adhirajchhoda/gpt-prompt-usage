# gpt-prompt-badge

This repository contains a lightweight browser extension that displays a vertical
badge on ChatGPT pages showing how many messages you have used and how many
remain per model within the current quota window. It works on `chat.openai.com`
and `chatgpt.com` conversation pages, including deep `/c/…` URLs.

## Features

* Tracks usage for multiple models, including GPT‑5 Thinking, GPT‑4.1,
  GPT‑4o, and OpenAI's mini models.
* Supports both conversation POST requests and streaming responses.
* Displays a vertical badge on the right side with a dark background and
  highlights models in red when they reach 90 % of the quota.
* Does not collect or send any data off‑device — all logic runs in your
  browser.

## Installation

1. Open `chrome://extensions` in Chrome or Edge and enable **Developer mode**.
2. Click **Load unpacked** and select the `gpt-prompt-badge` folder.
3. Navigate to ChatGPT and send messages. The badge should appear on the right.

## Structure

```
gpt-prompt-badge/
  ├─ manifest.json      – Chrome extension manifest (MV3)
  ├─ content.js         – Injects the page script into the page context
  ├─ page-script.js     – Implements the badge and usage tracking logic
  └─ README.md          – This file
```

The extension does not include icons or images to remain lightweight. Feel free
to add your own icons under an `icons/` directory and reference them in
`manifest.json` if desired.

## License

MIT License. See [`LICENSE`](LICENSE) for details.