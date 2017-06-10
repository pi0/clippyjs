import Agent from './agent'
import Animator from './animator'
import Queue from './queue'
import Balloon from './balloon'
import { load, ready, soundsReady } from './load'

const clippy = {
    Agent,
    Animator,
    Queue,
    Balloon,
    load,
    ready,
    soundsReady
}

export default clippy

if (typeof window !== 'undefined') {
    window.clippy = clippy
}


