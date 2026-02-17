import Agent from "./agent.ts";
import Animator from "./animator.ts";
import Queue from "./queue.ts";
import Balloon from "./balloon.ts";
import { load, ready, soundsReady } from "./load.ts";

export const clippy = {
  Agent,
  Animator,
  Queue,
  Balloon,
  load,
  ready,
  soundsReady,
};

globalThis.clippy = clippy;
