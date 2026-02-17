import Agent from "./agent.ts";

// Cache for loaded resources
const _maps = {};
const _sounds = {};
const _data = {};
const _dataCallbacks = {};
const _soundsCallbacks = {};

/**
 * Load a sprite sheet map image
 * @param {string} path - Path to agent directory
 * @returns {Promise} - Resolves when image is loaded
 * @private
 */
function _loadMap(path) {
  let dfd = _maps[path];
  if (dfd) return dfd;

  dfd = _maps[path] = new Promise((resolve, reject) => {
    let src = path + "/map.png";
    let img = new Image();

    img.onload = resolve;
    img.onerror = reject;

    img.setAttribute("src", src);
  });

  return dfd;
}

/**
 * Load sound files for an agent
 * @param {string} name - Agent name
 * @param {string} path - Path to agent directory
 * @returns {Promise<Object>} - Resolves with sound map or empty object
 * @private
 */
function _loadSounds(name, path) {
  let dfd = _sounds[name];
  if (dfd) return dfd;

  dfd = _sounds[name] = new Promise((resolve, reject) => {
    let audio = document.createElement("audio");
    let canPlayMp3 = !!audio.canPlayType && "" !== audio.canPlayType("audio/mpeg");
    let canPlayOgg = !!audio.canPlayType && "" !== audio.canPlayType('audio/ogg; codecs="vorbis"');

    if (!canPlayMp3 && !canPlayOgg) {
      resolve({});
    } else {
      let src = path + (canPlayMp3 ? "/sounds-mp3.js" : "/sounds-ogg.js");
      _soundsCallbacks[name] = { resolve, reject };
      _loadScript(src);
    }
  });

  return dfd;
}

/**
 * Load agent animation data
 * @param {string} name - Agent name
 * @param {string} path - Path to agent directory
 * @returns {Promise<Object>} - Resolves with agent data
 * @private
 */
function _loadAgent(name, path) {
  let dfd = _data[name];
  if (dfd) return dfd;

  dfd = _data[name] = new Promise((resolve, reject) => {
    _dataCallbacks[name] = { resolve, reject };
  });

  let src = path + "/agent.js";
  _loadScript(src);

  return dfd;
}

/**
 * Dynamically load a script file
 * @param {string} src - Script URL
 * @private
 */
function _loadScript(src) {
  let script = document.createElement("script");
  script.setAttribute("src", src);
  script.setAttribute("async", "async");
  script.setAttribute("type", "text/javascript");

  document.head.appendChild(script);
}

/**
 * Load an agent with all its assets
 * @param {string} name - Agent name (e.g., 'Clippy', 'Merlin')
 * @param {Function} successCb - Called with initialized Agent instance
 * @param {Function} [failCb] - Called if loading fails
 * @param {string} [base_path] - Custom base path for agent assets
 */
export function load(name, successCb, failCb, base_path) {
  base_path =
    base_path ||
    (window as any).CLIPPY_CDN ||
    "https://cdn.jsdelivr.net/gh/pi0/clippyjs@master/assets/agents/";

  let path = base_path + name;
  let mapDfd = _loadMap(path);
  let agentDfd = _loadAgent(name, path);
  let soundsDfd = _loadSounds(name, path);

  let data;
  agentDfd.then(function (d) {
    data = d;
  });

  let sounds;
  soundsDfd.then(function (d) {
    sounds = d;
  });

  let cb = function () {
    let a = new Agent(path, data, sounds);
    successCb(a);
  };

  Promise.all([mapDfd, agentDfd, soundsDfd]).then(cb).catch(failCb);
}

/**
 * Called by agent.js files to register agent data
 * This function is called by dynamically loaded agent scripts
 * @param {string} name - Agent name
 * @param {Object} data - Agent animation data
 */
export function ready(name, data) {
  let callbacks = _dataCallbacks[name];
  if (callbacks && callbacks.resolve) {
    callbacks.resolve(data);
  }
}

/**
 * Called by sound files to register sound data
 * This function is called by dynamically loaded sound scripts
 * @param {string} name - Agent name
 * @param {Object} data - Sound URL mappings
 */
export function soundsReady(name, data) {
  let callbacks = _soundsCallbacks[name];
  if (callbacks && callbacks.resolve) {
    callbacks.resolve(data);
  }
}
