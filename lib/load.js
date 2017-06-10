import $ from 'jquery'
import Agent from './agent'

export class load {
    constructor(name, successCb, failCb, base_path = './agents/') {
        let path = base_path + name;
        let mapDfd = load._loadMap(path);
        let agentDfd = load._loadAgent(name, path);
        let soundsDfd = load._loadSounds(name, path);

        let data;
        agentDfd.done(function (d) {
            data = d;
        });

        let sounds;

        soundsDfd.done(function (d) {
            sounds = d;
        });

        // wrapper to the success callback
        let cb = function () {
            let a = new Agent(path, data, sounds);
            successCb(a);
        };

        $.when(mapDfd, agentDfd, soundsDfd).done(cb).fail(failCb);
    }

    static _loadMap(path) {
        let dfd = load._maps[path];
        if (dfd) return dfd;

        // set dfd if not defined
        dfd = load._maps[path] = $.Deferred();

        let src = path + '/map.png';
        let img = new Image();

        img.onload = dfd.resolve;
        img.onerror = dfd.reject;

        // start loading the map;
        img.setAttribute('src', src);

        return dfd.promise();
    }

    static _loadSounds(name, path) {
        let dfd = load._sounds[name];
        if (dfd) return dfd;

        // set dfd if not defined
        dfd = load._sounds[name] = $.Deferred();

        let audio = document.createElement('audio');
        let canPlayMp3 = !!audio.canPlayType && "" !== audio.canPlayType('audio/mpeg');
        let canPlayOgg = !!audio.canPlayType && "" !== audio.canPlayType('audio/ogg; codecs="vorbis"');

        if (!canPlayMp3 && !canPlayOgg) {
            dfd.resolve({});
        } else {
            let src = path + (canPlayMp3 ? '/sounds-mp3.js' : '/sounds-ogg.js');
            // load
            load._loadScript(src);
        }

        return dfd.promise()
    }

    static _loadAgent(name, path) {
        let dfd = load._data[name];
        if (dfd) return dfd;

        dfd = load._getAgentDfd(name);

        let src = path + '/agent.js';

        load._loadScript(src);

        return dfd.promise();
    }

    static _loadScript(src) {
        let script = document.createElement('script');
        script.setAttribute('src', src);
        script.setAttribute('async', 'async');
        script.setAttribute('type', 'text/javascript');

        document.head.appendChild(script);
    }

    static _getAgentDfd(name) {
        let dfd = load._data[name];
        if (!dfd) {
            dfd = load._data[name] = $.Deferred();
        }
        return dfd;
    }
}

load._maps = {};
load._sounds = {};
load._data = {};

export function ready (name, data) {
    let dfd = load._getAgentDfd(name);
    dfd.resolve(data);
}

export function soundsReady (name, data) {
    let dfd = load._sounds[name];
    if (!dfd) {
        dfd = load._sounds[name] = $.Deferred();
    }

    dfd.resolve(data);
}
