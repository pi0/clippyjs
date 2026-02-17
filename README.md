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

// Move to a given point, using animation if available
agent.moveTo(100, 100);

// Gesture at a given point (if a gesture animation is available)
agent.gestureAt(200, 200);

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

# License

[MIT](./LICENCE)

This project is a fresh rewrite of [Clippy.JS](http://smore.com/clippy-js).

- [Clippy.JS](http://smore.com/clippy-js) by [Smore](http://smore.com)
- [Cinnamon Software](http://www.cinnamonsoftware.com/) for developing [Double Agent](http://doubleagent.sourceforge.net/), the program used to unpack Clippy and his friends
- Microsoft, for creating Clippy :)
