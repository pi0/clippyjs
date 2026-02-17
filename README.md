# Clippy

Add Clippy or his friends to any website for instant nostalgia!

[**Online Demo**](https://clippy.pi0.io/)

## Usage

### CDN (no build tools)

You can use ClippyJS directly in the browser using CDN:

```html
<!doctype html>
<html>
  <body>
    <script type="module">
      import { initAgent } from "https://cdn.jsdelivr.net/npm/clippyjs/dist/index.mjs";
      import * as agents from "https://cdn.jsdelivr.net/npm/clippyjs/dist/agents/index.mjs";
      const agent = await initAgent(agents.Clippy);
      agent.show();
      agent.speak("Hello! I'm Clippy, your virtual assistant.");
    </script>
  </body>
</html>
```

### npm package

Install and import an agent:

```js
import { initAgent } from "clippyjs";
import { Clippy } from "clippyjs/agents";

// Load and show the agent
const agent = await initAgent(Clippy);
agent.show();
```

### Available agents

You can import agents individually or all at once:

```js
// Import all agents
import * as agents from "clippyjs/agents";

// Or import individually
import { Clippy } from "clippyjs/agents";
// Also available: Bonzi, F1, Genie, Genius, Links, Merlin, Peedy, Rocky, Rover
```

Each agent can also be imported from its own subpath:

```js
import Merlin from "clippyjs/agents/merlin";
```

## API

All agent actions are queued and executed sequentially, so you can chain them.

```js
// Play a specific animation
agent.play("Searching");

// Play a random animation
agent.animate();

// List all available animations
agent.animations();
// => ["MoveLeft", "Congratulate", "Hide", "Pleased", "Acknowledge", ...]

// Show a speech balloon
agent.speak("When all else fails, bind some paper together. My name is Clippy.");

// Speak with text-to-speech (uses Web Speech API)
agent.speak("Hello! I'm here to help.", { tts: true });

// Keep the balloon open until manually closed
agent.speak("Read this carefully.", { hold: true });

// Move to a given point, using animation if available
agent.moveTo(100, 100);

// Gesture at a given point (if a gesture animation is available)
agent.gestureAt(200, 200);

// Stream text into the speech balloon from an async iterable (e.g. LLM response)
await agent.speakStream(asyncIterableOfChunks);
await agent.speakStream(asyncIterableOfChunks, { tts: true });

// Stop the current action in the queue
agent.stopCurrent();

// Stop all actions and return to idle
agent.stop();

// Hide the agent
agent.hide();

// Pause and resume animations
agent.pause();
agent.resume();

// Remove the agent from the DOM
agent.dispose();
```

## Text-to-Speech

Each agent has a unique voice personality using the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API). Pass `{ tts: true }` to `speak()` to hear them talk:

```js
agent.speak("Hello! I'm Clippy, your virtual assistant.", { tts: true });
```

| Agent  | Rate | Pitch | Personality                                |
| ------ | ---- | ----- | ------------------------------------------ |
| Clippy | 1.1  | 1.3   | Upbeat, slightly fast office assistant     |
| Bonzi  | 0.9  | 0.6   | Deep, slow, mischievous gorilla            |
| F1     | 1.3  | 1.0   | Fast-talking robot                         |
| Genie  | 0.85 | 0.8   | Calm, deep-voiced magical genie            |
| Genius | 0.8  | 0.5   | Slow, deep, thoughtful Einstein-like voice |
| Links  | 1.0  | 1.5   | High-pitched, energetic cat                |
| Merlin | 0.8  | 0.7   | Slow, wise old wizard                      |
| Peedy  | 1.2  | 1.4   | Chirpy, fast-talking parrot                |
| Rocky  | 0.9  | 0.5   | Deep, gruff, tough dog                     |
| Rover  | 1.25 | 1.4   | Excited, eager, playful dog                |

> [!NOTE]
> TTS availability and voice selection depends on the browser and operating system. The agent will attempt to match its preferred voice from the available system voices.

# License

[MIT](./LICENCE)

This project is a fresh rewrite of [Clippy.JS](http://smore.com/clippy-js).

- [Clippy.JS](http://smore.com/clippy-js) by [Smore](http://smore.com)
- [Cinnamon Software](http://www.cinnamonsoftware.com/) for developing [Double Agent](http://doubleagent.sourceforge.net/), the program used to unpack Clippy and his friends
- Microsoft, for creating Clippy :)
