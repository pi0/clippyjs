import Agent from './agent'

const _maps = {};
const _sounds = {};
const _data = {};
const _dataCallbacks = {};
const _soundsCallbacks = {};

function _loadMap(path) {
    let dfd = _maps[path];
    if (dfd) return dfd;

    // set dfd if not defined
    dfd = _maps[path] = new Promise((resolve, reject) => {
        let src = path + '/map.png';
        let img = new Image();

        img.onload = resolve;
        img.onerror = reject;

        // start loading the map;
        img.setAttribute('src', src);
    });

    return dfd;
}

function _loadSounds(name, path) {
    let dfd = _sounds[name];
    if (dfd) return dfd;

    // set dfd if not defined
    dfd = _sounds[name] = new Promise((resolve, reject) => {
        let audio = document.createElement('audio');
        let canPlayMp3 = !!audio.canPlayType && "" !== audio.canPlayType('audio/mpeg');
        let canPlayOgg = !!audio.canPlayType && "" !== audio.canPlayType('audio/ogg; codecs="vorbis"');

        if (!canPlayMp3 && !canPlayOgg) {
            resolve({});
        } else {
            let src = path + (canPlayMp3 ? '/sounds-mp3.js' : '/sounds-ogg.js');
            // Store resolve/reject for later use
            _soundsCallbacks[name] = { resolve, reject };
            // load
            _loadScript(src);
        }
    });

    return dfd;
}

function _loadAgent(name, path) {
    let dfd = _data[name];
    if (dfd) return dfd;

    // Create the promise and store it
    dfd = _data[name] = new Promise((resolve, reject) => {
        // Store resolve/reject for external access via ready()
        _dataCallbacks[name] = { resolve, reject };
    });

    let src = path + '/agent.js';

    _loadScript(src);

    return dfd;
}

function _loadScript(src) {
    let script = document.createElement('script');
    script.setAttribute('src', src);
    script.setAttribute('async', 'async');
    script.setAttribute('type', 'text/javascript');

    document.head.appendChild(script);
}

export function load(name, successCb, failCb, base_path) {
    base_path = base_path || window.CLIPPY_CDN || './assets/agents/'

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

    // wrapper to the success callback
    let cb = function () {
        let a = new Agent(path, data, sounds);
        successCb(a);
    };

    Promise.all([mapDfd, agentDfd, soundsDfd]).then(cb).catch(failCb);
}

export function ready(name, data) {
    let callbacks = _dataCallbacks[name];
    if (callbacks && callbacks.resolve) {
        callbacks.resolve(data);
    }
}

export function soundsReady(name, data) {
    let callbacks = _soundsCallbacks[name];
    if (callbacks && callbacks.resolve) {
        callbacks.resolve(data);
    }
}