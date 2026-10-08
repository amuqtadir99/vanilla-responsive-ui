# AI chat and agent interfaces

Chat components give your product the interaction people expect from AI
platforms: streaming replies, Markdown and code, visible tool steps,
sources, charts, follow-up suggestions, feedback buttons and saved
conversations. They are plain HTML + one ES module, so they work in any
stack, and they talk to **your** backend over a simple streaming protocol.

## What is included

| Piece | Where | Persona (demo) |
| --- | --- | --- |
| Embeddable chat panel | [`src/components/chat.html`](../src/components/chat.html) | `general` |
| Floating support widget | [`src/components/chat-widget.html`](../src/components/chat-widget.html), partial `chat-widget` (website, shop, landing) | `support` |
| Static message anatomy | [`src/components/chat-message.html`](../src/components/chat-message.html) | — |
| Full-page assistant with saved conversations | [`src/templates/ai/index.html`](../src/templates/ai/index.html) | `general` |
| Agent workspace with live plan and tool panel | [`src/templates/ai/agent.html`](../src/templates/ai/agent.html) | `agent` |
| "Ask your data" analyst with charts | [`src/templates/dashboard/assistant.html`](../src/templates/dashboard/assistant.html) | `analyst` |

Without a backend, a built-in mock (`src/assets/js/demo/chat-mock.js`)
answers from the sample data, so you can explore the UI offline. Replace it
before production.

## Markup

```html
<section class="chat" data-chat data-chat-endpoint="/api/chat" data-chat-storage="my-chat" aria-labelledby="chat-title">
  <header class="chat__header">
    <div class="chat__heading"><h2 class="chat__title" id="chat-title">Assistant</h2></div>
    <button type="button" class="btn btn--ghost btn--sm" data-chat-clear hidden>New chat</button>
  </header>
  <div class="chat__log" role="log" aria-label="Conversation" aria-live="off" tabindex="0" data-chat-log>
    <!-- optional server-rendered greeting or transcript -->
  </div>
  <div class="chat__suggestions" data-chat-suggestions hidden>
    <button type="button" class="chip" data-chat-suggestion>Summarise this page</button>
  </div>
  <form class="chat__composer" action="/chat" method="post" data-chat-form>
    <label class="visually-hidden" for="chat-input">Message</label>
    <textarea class="chat__input" id="chat-input" name="message" rows="1" required data-chat-input></textarea>
    <div class="chat__actions">
      <button type="submit" class="btn btn--icon btn--sm" data-chat-send><span class="visually-hidden">Send</span>…</button>
      <button type="button" class="btn btn--icon btn--sm btn--secondary" data-chat-stop hidden><span class="visually-hidden">Stop generating</span>…</button>
    </div>
  </form>
</section>
```

| Attribute | Purpose |
| --- | --- |
| `data-chat-endpoint` | URL that streams replies (see protocol below) |
| `data-chat-transport` | Name of a transport registered with `registerTransport()` |
| `data-chat-persona` | Sent to your backend (and selects the demo persona) |
| `data-chat-storage` | localStorage key to keep the conversation across visits |

Add `class="chat--page"` for a full-height layout, and the
`data-chat-attach` button + `data-chat-file` input +
`data-chat-attachments` container to accept files (names are sent with the
message; upload them yourself if you need the contents).

## Streaming protocol

The component `POST`s JSON to `data-chat-endpoint`:

```json
{
  "persona": "support",
  "messages": [
    { "role": "user", "text": "Where is my order #1061?", "files": [] },
    { "role": "assistant", "text": "…" },
    { "role": "user", "text": "And #1063?", "files": [] }
  ]
}
```

Respond with a stream of events, one JSON object per line
(`application/x-ndjson`) or per Server-Sent Event `data:` line
(`text/event-stream`). A `text/plain` stream is treated as text deltas.

| Event | Renders |
| --- | --- |
| `{"type":"text","delta":"Hello"}` | Appends Markdown text |
| `{"type":"tool","id":"t1","name":"lookup_order","title":"Looking up order","status":"running","input":{…}}` | A collapsible tool step; send again with `"status":"done"` (or `"error"`) and `"output"` |
| `{"type":"chart","viz":"bar","title":"…","x":"month","series":"revenue:Revenue","format":"currency-compact","rows":[…]}` | An accessible SVG chart (same options as [charts](DATA.md#charts)) |
| `{"type":"sources","items":[{"title":"Returns policy","url":"https://…"}]}` | A numbered source list |
| `{"type":"suggestions","items":["Track another order"]}` | Follow-up chips |
| `{"type":"error","message":"…"}` | An inline error |
| `{"type":"done"}` | Ends the reply (closing the stream also works) |

Any other event type (for example `plan`, `step` or `artifact`) is
ignored by the chat but dispatched as a `chat:event` CustomEvent, so your
page can render extra UI. The agent workspace uses this for its run panel.

## Backend examples

These examples call Claude through the official Anthropic SDKs and stream
text back as NDJSON. They use `claude-opus-5-5` and opt into server-side
**refusal fallbacks** (`fallbacks: "default"`), so a request declined by a
safety classifier is re-run on Anthropic's recommended fallback model
instead of failing. A reply that is still declined ends with
`stop_reason: "refusal"`, which the examples turn into an `error` event.
Keep your API key on the server; never send it to the browser.

### Node.js (`node:http`, no framework)

```js
// server.mjs — npm install @anthropic-ai/sdk ; ANTHROPIC_API_KEY in the environment
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

function toClaudeMessages(messages) {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.text?.trim())
    .map((m) => ({ role: m.role, content: m.text }));
}

http
  .createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/api/chat') {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    const { messages = [] } = JSON.parse(body || '{}');

    res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' });
    const send = (event) => res.write(`${JSON.stringify(event)}\n`);

    try {
      const stream = client.beta.messages.stream({
        model: 'claude-opus-5-5',
        max_tokens: 64000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: 'You are a concise, helpful assistant. Use Markdown.',
        messages: toClaudeMessages(messages),
      });
      res.on('close', () => {
        if (!res.writableEnded) stream.abort(); // the user pressed Stop or left
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          send({ type: 'text', delta: event.delta.text });
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') send({ type: 'error', message: 'Sorry, I can’t help with that request.' });
      send({ type: 'done' });
    } catch (error) {
      send({ type: 'error', message: 'The assistant is unavailable. Please try again.' });
    }
    res.end();
  })
  .listen(8787);
```

### Python (FastAPI)

```python
# app.py — pip install anthropic fastapi uvicorn ; ANTHROPIC_API_KEY in the environment
import json
from anthropic import AsyncAnthropic
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

app = FastAPI()
client = AsyncAnthropic()


def to_claude_messages(messages):
    return [
        {"role": m["role"], "content": m["text"]}
        for m in messages
        if m.get("role") in ("user", "assistant") and m.get("text", "").strip()
    ]


@app.post("/api/chat")
async def chat(request: Request):
    payload = await request.json()

    async def events():
        try:
            async with client.beta.messages.stream(
                model="claude-opus-5-5",
                max_tokens=64000,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                system="You are a concise, helpful assistant. Use Markdown.",
                messages=to_claude_messages(payload.get("messages", [])),
            ) as stream:
                async for text in stream.text_stream:
                    yield json.dumps({"type": "text", "delta": text}) + "\n"
                final = await stream.get_final_message()
                if final.stop_reason == "refusal":
                    yield json.dumps({"type": "error", "message": "Sorry, I can't help with that request."}) + "\n"
        except Exception:
            yield json.dumps({"type": "error", "message": "The assistant is unavailable. Please try again."}) + "\n"
        yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")
```

### Tools and agents

When your backend runs a tool loop (your own tools, the SDK tool runner or
a hosted agent), forward its progress as `tool` events so people can see
what the agent is doing:

```js
send({ type: 'tool', id: block.id, name: block.name, title: 'Searching orders', status: 'running', input: block.input });
// …run the tool…
send({ type: 'tool', id: block.id, name: block.name, title: 'Searching orders', status: 'done', output: summary });
```

Send charts as `chart` events with the rows your tool returned, and links
you used as `sources`. Keep tool outputs short in the UI; the full result
belongs in the model's context, not on screen.

### Same origin and CSP

The templates' Content-Security-Policy allows `connect-src 'self'`. Serve
the chat endpoint from the same origin (for example `/api/chat`), or add
your API host to `connect-src`.

## Custom transports

For WebSockets, a vendor SDK in the browser, or a non-standard API, register
an async generator that yields the same events:

```js
import { registerTransport } from './assets/js/components/chat.js';

registerTransport('my-agent', async function* ({ messages, persona, signal }) {
  const socket = await openSocket(signal);          // your code
  socket.send(JSON.stringify({ messages, persona }));
  for await (const message of socket) yield JSON.parse(message);
});
```

```html
<section class="chat" data-chat data-chat-transport="my-agent">…</section>
```

Register transports before `main.js` initialises the page (load your module
first), or call `init()` from `components/chat.js` afterwards.

## Page integration

- `chat:event` — every stream event (`event.detail`), for custom panels.
- `chat:done` — a reply finished (`event.detail.message`).
- `chat:feedback` — thumbs up/down (`{ message, value }`); send it to your analytics.
- `chat:clear` — the user started a new conversation.
- `element.chat.send(text)`, `element.chat.stop()`, `element.chat.messages`.

## Accessibility

- The conversation is a labelled, focusable `role="log"` region; each
  message starts with hidden "You said" / "Assistant said" text.
- Replies are announced **once when complete** through a polite live
  region, not token by token; tool steps announce when they start and finish.
- Enter sends, Shift+Enter adds a new line, Escape stops a reply (or
  closes the widget). The widget returns focus to its launcher when closed.
- Every button has a text label; feedback buttons use `aria-pressed`.
- Motion (typing dots, spinners) respects `prefers-reduced-motion`.

## Security

- All model output is rendered with `textContent` / `createElement` via
  `core/markdown.js`; HTML in a reply is shown as text, never executed.
- Links are limited to `http(s)` and `mailto`; external links open in a
  new tab with `rel="noopener noreferrer"`.
- Saved conversations live in the visitor's localStorage. Don't enable
  `data-chat-storage` for chats that may contain sensitive data, or store
  history on your server instead.
- Validate, rate-limit and authenticate the chat endpoint like any other
  API; treat user messages as untrusted input to your tools.
