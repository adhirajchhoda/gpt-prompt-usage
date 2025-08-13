This repository contains a lightweight browser extension that displays a vertical
badge on ChatGPT pages showing how many messages you have used and how many
remain per model within the current quota window.

## Features

* Tracks usage for multiple GPT models, including 5 Thinking, 4.1, 4o, o3 and OpenAI's other mini models.
* Supports both conversation POST requests and streaming responses.
* Highlights models in red when they reach 90 % of the quota.
* Does not collect or send any data off‑device — all logic runs in your
  browser.

## Installation

1. Open `chrome://extensions` in Chrome or Edge and enable **Developer mode**.
2. Click **Load unpacked** and select the `gpt-prompt-badge` folder.
3. Navigate to ChatGPT and send messages. The badge should appear on the right.

## Structure

```
gpt-prompt-usage/
  ├─ manifest.json      – Chrome extension manifest (MV3)
  ├─ content.js         – Injects the page script into the page context
  ├─ page-script.js     – Implements the badge and usage tracking logic
  └─ README.md          – This file
```

## License

MIT License. See [`LICENSE`](LICENSE) for details.
