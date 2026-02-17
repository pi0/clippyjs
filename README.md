# Clippy

> Add Clippy or his friends to any website for instant nostalgia.
> This project is a fresh rewrite of [Clippy.JS](http://smore.com/clippy-js) in ES6.
> ([Read More](http://smore.com/clippy-js))

<!-- automd:badges color=yellow -->

[![npm version](https://img.shields.io/npm/v/clippyjs?color=yellow)](https://npmjs.com/package/clippyjs)
[![npm downloads](https://img.shields.io/npm/dm/clippyjs?color=yellow)](https://npm.chart.dev/clippyjs)

<!-- /automd -->

## Demos

Please be patient for first load. It may take some time as agents are loaded one by one.

- [Simple JSFiddle](https://jsfiddle.net/pi0/rtw8p05k)
- [Agents Zoo](https://pi0.github.io/clippyjs/demo/index.html)

![image](https://user-images.githubusercontent.com/5158436/27002340-c221cc06-4df4-11e7-9438-050a3ad8ecde.png)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fpi0%2Fclippyjs.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fpi0%2Fclippyjs?ref=badge_shield)

## Usage

Install:

```bash
nypx nypm i clippyjs
```

Import and create an agent:

```js
import { initAgent } from "clippyjs";
import { Clippy } from "clippyjs/agents";

// Load and show the agent
const agent = await initAgent(Clippy);
agent.show();
```

### Available Agents

You can import individual agents or all of them:

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

All agent actions are queued and executed in order, so you can stack them.

```js
// Play a given animation
agent.play("Searching");

// Play a random animation
agent.animate();

// Get a list of all the animations
agent.animations();
// => ["MoveLeft", "Congratulate", "Hide", "Pleased", "Acknowledge", ...]

// Show text balloon
agent.speak("When all else fails, bind some paper together. My name is Clippy.");

// Move to the given point, use animation if available
agent.moveTo(100, 100);

// Gesture at a given point (if gesture animation is available)
agent.gestureAt(200, 200);

// Stop the current action in the queue
agent.stopCurrent();

// Stop all actions in the queue and go back to idle mode
agent.stop();

// Hide the agent
agent.hide();

// Pause/resume animations
agent.pause();
agent.resume();

// Clean up and remove the agent from the DOM
agent.dispose();
```

# License

[MIT](./LICENCE)

- The [Clippy.JS](http://smore.com/clippy-js) project by [Smore](http://smore.com)
- The awesome [Cinnamon Software](http://www.cinnamonsoftware.com/) for developing [Double Agent](http://doubleagent.sourceforge.net/)
  the program we used to unpack Clippy and his friends!
- Microsoft, for creating clippy :)
