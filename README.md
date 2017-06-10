# Clippy
Add Clippy or his friends to any website for instant nostalgia.  
This project is a fresh rewrite of [Clippy.JS](http://smore.com/clippy-js) in ES6.   
Read more about the main project on [its' homepage](http://smore.com/clippy-js).    

## Usage (Webpack)
Install dependency
```bash
yarn add clippy-js # or npm install clippy-js
```

Import and Load
```js
import clippy from 'clippyjs'

clippy.load('Merlin', (agent) => {
    // do anything with the loaded agent
    agent.show();
});
```

## Usage (Web)
Add this code to you to your page to enable Clippy2.

```html
<!-- Add the stylesheet to the head -->
<link rel="stylesheet" type="text/css" href="clippy.css" media="all">

<!-- Add these scripts to  the bottom of the page -->
<!-- jQuery 1.7+ -->
<script src="jquery.1.7.min.js"></script>

<!-- Clippy.js -->
<script src="clippy.min.js"></script>

<!-- Init script -->
<script type="text/javascript">
    clippy.load('Merlin', function(agent){
        // do anything with the loaded agent
        agent.show();
    });
</script>
```

## Actions
All the agent actions are queued and executed by order, so you could stack them.

```javascript
// play a given animation
agent.play('Searching');

// play a random animation
agent.animate();

// get a list of all the animations
agent.animations();
// => ["MoveLeft", "Congratulate", "Hide", "Pleased", "Acknowledge", ...]

// Show text balloon
agent.speak('When all else fails, bind some paper together. My name is Clippy.');

// move to the given point, use animation if available
agent.moveTo(100,100);

// gesture at a given point (if gesture animation is available)
agent.gestureAt(200,200);

// stop the current action in the queue
agent.stopCurrent();

// stop all actions in the queue and go back to idle mode
agent.stop();
```

# Licence
MIT

## Special Thanks
- The [Clippy.JS](http://smore.com/clippy-js) project by [Smore](http://smore.com)
- The awesome [Cinnamon Software](http://www.cinnamonsoftware.com/) for developing [Double Agent](http://doubleagent.sourceforge.net/)
the program we used to unpack Clippy and his friends!
- Microsoft, for creating clippy :)