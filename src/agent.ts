import Queue from "./queue.ts";
import Animator from "./animator.ts";
import Balloon from "./balloon.ts";

export interface AgentLoaders {
  agent: () => Promise<{ default: any }>;
  sound: () => Promise<{ default: any }>;
  map: () => Promise<{ default: string }>;
}

/**
 * Agent class represents an animated character that can move, speak, and perform actions
 */
export default class Agent {
  _queue: Queue;
  _el: HTMLElement;
  _animator: Animator;
  _balloon: Balloon;
  _hidden: boolean;
  _idlePromise: Promise<void> | null;
  _idleResolve: Function | null;
  _offset: { top: number; left: number };
  _targetX: number;
  _targetY: number;
  _moveHandle: Function;
  _upHandle: Function;
  _dragUpdateLoop: number;
  _dragging: boolean;
  _resizeHandle: () => void;
  _mouseDownHandle: (e: MouseEvent) => void;
  _dblClickHandle: () => void;
  _tts: { rate: number; pitch: number; voice: string } | undefined;

  /**
   * @param {string} mapUrl - URL to the agent's sprite sheet
   * @param {Object} data - Agent animation data
   * @param {Object} sounds - Map of sound names to audio URLs
   */
  constructor(mapUrl: string, data: any, sounds: any) {
    this._queue = new Queue(this._onQueueEmpty.bind(this));

    this._el = document.createElement("div");
    Object.assign(this._el.style, {
      position: "fixed",
      zIndex: "10001",
      cursor: "pointer",
      display: "none",
    });

    document.body.appendChild(this._el);

    this._animator = new Animator(this._el, mapUrl, data, sounds);
    this._balloon = new Balloon(this._el);
    this._tts = data.tts;

    this._setupEvents();
  }

  /**
   * Make the agent gesture towards a specific point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} - True if gesture animation was played
   */
  gestureAt(x, y) {
    let d = this._getDirection(x, y);
    let gAnim = "Gesture" + d;
    let lookAnim = "Look" + d;

    let animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
    return this.play(animation);
  }

  /**
   * Hide the agent
   * @param {boolean} [fast] - If true, hide immediately without animation
   * @param {Function} [callback] - Called when hide is complete
   */
  hide(fast, callback) {
    this._hidden = true;
    let el = this._el;
    this.stop();
    if (fast) {
      this._el.style.display = "none";
      this.stop();
      this.pause();
      if (callback) callback();
      return;
    }

    return this._playInternal("Hide", function () {
      el.style.display = "none";
      this.pause();
      if (callback) callback();
    });
  }

  /**
   * Move the agent to a specific position
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   * @param {number} [duration=1000] - Movement duration in milliseconds
   */
  moveTo(x, y, duration) {
    let dir = this._getDirection(x, y);
    let anim = "Move" + dir;
    if (duration === undefined) duration = 1000;

    this._addToQueue(function (complete) {
      let clamped = this._clampXY(x, y);
      let cx = clamped.x;
      let cy = clamped.y;

      if (duration === 0) {
        this._el.style.top = cy + "px";
        this._el.style.left = cx + "px";
        this.reposition();
        complete();
        return;
      }

      if (!this.hasAnimation(anim)) {
        this._animate(this._el, { top: cy, left: cx }, duration, complete);
        return;
      }

      let callback = (name, state) => {
        if (state === Animator.States.EXITED) {
          complete();
        }
        if (state === Animator.States.WAITING) {
          this._animate(this._el, { top: cy, left: cx }, duration, () => {
            this._animator.exitAnimation();
          });
        }
      };

      this._playInternal(anim, callback);
    }, this);
  }

  /**
   * Animate element properties over time using requestAnimationFrame
   * @param {HTMLElement} element - Element to animate
   * @param {Object} props - Properties to animate (e.g., {top: 100, left: 200})
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} [callback] - Called when animation completes
   * @private
   */
  _animate(element, props, duration, callback) {
    const start = performance.now();
    const startProps = {};

    for (let prop in props) {
      const currentValue = parseFloat(getComputedStyle(element)[prop]) || 0;
      startProps[prop] = currentValue;
    }

    // jQuery swing easing: ease-in-out
    const swing = (p) => 0.5 - Math.cos(p * Math.PI) / 2;

    const animate = (currentTime) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = swing(progress);

      for (let prop in props) {
        const startValue = startProps[prop];
        const endValue = props[prop];
        const currentValue = startValue + (endValue - startValue) * eased;
        element.style[prop] = currentValue + "px";
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (callback) {
        callback();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Internal animation playback that handles idle animation interruption
   * @param {string} animation - Animation name
   * @param {Function} callback - State change callback
   * @private
   */
  _playInternal(animation, callback) {
    // Wait for idle animation to complete before starting new animation
    if (this._isIdleAnimation() && this._idlePromise) {
      this._idlePromise.then(() => {
        this._playInternal(animation, callback);
      });
      return;
    }

    this._animator.showAnimation(animation, callback);
  }

  /**
   * Play a named animation
   * @param {string} animation - Animation name
   * @param {number} [timeout=5000] - Timeout in milliseconds before auto-exiting
   * @param {Function} [cb] - Callback when animation completes
   * @returns {boolean} - True if animation exists and was queued
   */
  play(animation, timeout?: number, cb?: Function) {
    if (!this.hasAnimation(animation)) return false;

    if (timeout === undefined) timeout = 5000;

    this._addToQueue(function (complete) {
      let completed = false;

      let callback = function (name, state) {
        if (state === Animator.States.EXITED) {
          completed = true;
          if (cb) cb();
          complete();
        }
      };

      if (timeout) {
        window.setTimeout(() => {
          if (completed) return;
          this._animator.exitAnimation();
        }, timeout);
      }

      this._playInternal(animation, callback);
    }, this);

    return true;
  }

  /**
   * Show the agent
   * @param {boolean} [fast] - If true, show immediately without animation
   */
  show(fast?) {
    this._hidden = false;
    if (fast) {
      this._el.style.display = "block";
      this.resume();
      this._onQueueEmpty();
      return;
    }

    const style = getComputedStyle(this._el);

    if (style.top === "auto" || style.left === "auto") {
      let left = window.innerWidth < 600 ? window.innerWidth * 0.6 : window.innerWidth * 0.8;
      let top = window.innerWidth < 600 ? window.innerHeight * 0.7 : window.innerHeight * 0.8;
      let clamped = this._clampXY(left, top);
      this._el.style.top = clamped.y + "px";
      this._el.style.left = clamped.x + "px";
    }

    this.resume();
    return this.play("Show");
  }

  /**
   * Make the agent speak text in a speech balloon
   * @param {string} text - Text to display
   * @param {Object} [options] - Options
   * @param {boolean} [options.hold] - If true, keep balloon open until manually closed
   * @param {boolean} [options.tts] - If true, use Web Speech API to speak aloud
   */
  speak(text, options?: { hold?: boolean; tts?: boolean }) {
    this._addToQueue(function (complete) {
      this._balloon.speak(complete, text, options?.hold);
      if (options?.tts) this._speakTTS(text);
    }, this);
  }

  /**
   * Stream text into the speech balloon from an async iterable.
   *
   * @param {AsyncIterable<string>} source - Async iterable of text chunks
   * @param {Object} [options] - Options
   * @param {boolean} [options.tts] - If true, use TTS when stream is done
   */
  async speakStream(
    source: AsyncIterable<string>,
    options?: { tts?: boolean },
  ): Promise<void> {
    this.stop();

    let text = "";
    const stream = this._balloon.speakStream(() => {
      this._onQueueEmpty();
    });

    for await (const chunk of source) {
      text += chunk;
      stream.push(chunk);
    }

    if (options?.tts && text) this._speakTTS(text);
    stream.done();
  }

  /**
   * Close the current speech balloon
   */
  closeBalloon() {
    this._balloon.hide();
  }

  /**
   * Add a delay to the action queue
   * @param {number} [time=250] - Delay in milliseconds
   */
  delay(time) {
    time = time || 250;

    this._addToQueue(function (complete) {
      this._onQueueEmpty();
      window.setTimeout(complete, time);
    });
  }

  /**
   * Skip the current animation
   */
  stopCurrent() {
    this._animator.exitAnimation();
    this._balloon.close();
  }

  /**
   * Stop all animations and clear the queue
   */
  stop() {
    this._queue.clear();
    this._animator.exitAnimation();
    this._balloon.hide();
    if (this._tts && "speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
  }

  /**
   * Check if an animation exists
   * @param {string} name - Animation name
   * @returns {boolean}
   */
  hasAnimation(name) {
    return this._animator.hasAnimation(name);
  }

  /**
   * Get list of all available animations
   * @returns {string[]}
   */
  animations() {
    return this._animator.animations();
  }

  /**
   * Play a random non-idle animation
   * @returns {boolean}
   */
  animate() {
    let animations = this.animations();
    let anim = animations[Math.floor(Math.random() * animations.length)];

    if (anim.indexOf("Idle") === 0) {
      return this.animate();
    }
    return this.play(anim);
  }

  /**
   * Calculate direction from agent to a point
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   * @returns {string} - Direction: 'Up', 'Down', 'Left', 'Right', or 'Top'
   * @private
   */
  _getDirection(x, y) {
    let rect = this._el.getBoundingClientRect();
    let h = this._el.offsetHeight;
    let w = this._el.offsetWidth;

    let centerX = rect.left + w / 2;
    let centerY = rect.top + h / 2;

    let a = centerY - y;
    let b = centerX - x;

    let r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

    // Note: Left and Right are from the character's perspective
    if (-45 <= r && r < 45) return "Right";
    if (45 <= r && r < 135) return "Up";
    if ((135 <= r && r <= 180) || (-180 <= r && r < -135)) return "Left";
    if (-135 <= r && r < -45) return "Down";

    return "Top";
  }

  /**
   * Handle empty queue by transitioning to idle animation
   * @private
   */
  _onQueueEmpty() {
    if (this._hidden || this._isIdleAnimation()) return;

    let idleAnim = this._getIdleAnimation();
    this._idlePromise = new Promise((resolve) => {
      this._idleResolve = resolve;
    });

    this._animator.showAnimation(idleAnim, this._onIdleComplete.bind(this));
  }

  /**
   * Handle idle animation completion
   * @param {string} name - Animation name
   * @param {number} state - Animation state
   * @private
   */
  _onIdleComplete(name, state) {
    if (state === Animator.States.EXITED) {
      if (this._idleResolve) {
        this._idleResolve();
      }
      this._idlePromise = null;
      this._idleResolve = null;
    }
  }

  /**
   * Check if currently playing an idle animation
   * @returns {boolean}
   * @private
   */
  _isIdleAnimation() {
    let c = this._animator.currentAnimationName;
    return c && c.indexOf("Idle") === 0;
  }

  /**
   * Get a random idle animation name
   * @returns {string}
   * @private
   */
  _getIdleAnimation() {
    let animations = this.animations();
    let r = [];
    for (let i = 0; i < animations.length; i++) {
      let a = animations[i];
      if (a.indexOf("Idle") === 0) {
        r.push(a);
      }
    }

    let idx = Math.floor(Math.random() * r.length);
    return r[idx];
  }

  /**
   * Setup event listeners for resizing and interaction
   * @private
   */
  _setupEvents() {
    this._resizeHandle = this.reposition.bind(this);
    this._mouseDownHandle = this._onMouseDown.bind(this);
    this._dblClickHandle = this._onDoubleClick.bind(this);
    window.addEventListener("resize", this._resizeHandle);
    this._el.addEventListener("mousedown", this._mouseDownHandle);
    this._el.addEventListener("dblclick", this._dblClickHandle);
  }

  /**
   * Handle double-click to trigger ClickedOn animation or random animation
   * @private
   */
  _onDoubleClick() {
    if (!this.play("ClickedOn")) {
      this.animate();
    }
  }

  /**
   * Reposition agent to stay within viewport bounds
   */
  reposition() {
    const style = getComputedStyle(this._el);
    if (style.display === "none") return;
    if (style.visibility === "hidden") return;
    if (style.width === "0" || style.height === "0") return;

    let o = this._el.getBoundingClientRect();
    let bH = this._el.offsetHeight;
    let bW = this._el.offsetWidth;

    let wW = window.innerWidth;
    let wH = window.innerHeight;

    let top = o.top;
    let left = o.left;
    let m = 5;

    if (top - m < 0) {
      top = m;
    } else if (top + bH + m > wH) {
      top = wH - bH - m;
    }

    if (left - m < 0) {
      left = m;
    } else if (left + bW + m > wW) {
      left = wW - bW - m;
    }

    this._el.style.left = left + "px";
    this._el.style.top = top + "px";
    this._balloon.reposition();
  }

  /**
   * Handle mouse down to start dragging
   * @param {MouseEvent} e
   * @private
   */
  _onMouseDown(e) {
    e.preventDefault();
    this._startDrag(e);
  }

  /**
   * Initialize drag operation
   * @param {MouseEvent} e
   * @private
   */
  _startDrag(e) {
    this.pause();
    this._balloon.hide(true);
    this._offset = this._calculateClickOffset(e);

    this._moveHandle = this._dragMove.bind(this);
    this._upHandle = this._finishDrag.bind(this);

    // @ts-expect-error
    window.addEventListener("mousemove", this._moveHandle);
    // @ts-expect-error
    window.addEventListener("mouseup", this._upHandle);

    this._dragUpdateLoop = window.setTimeout(this._updateLocation.bind(this), 10);
  }

  /**
   * Calculate offset between click position and agent position
   * @param {MouseEvent} e
   * @returns {{top: number, left: number}}
   * @private
   */
  _calculateClickOffset(e) {
    let mouseX = e.pageX;
    let mouseY = e.pageY;
    let o = this._el.getBoundingClientRect();
    return {
      top: mouseY - (o.top + window.pageYOffset),
      left: mouseX - (o.left + window.pageXOffset),
    };
  }

  /**
   * Update agent position during drag
   * @private
   */
  _updateLocation() {
    this._el.style.top = this._targetY + "px";
    this._el.style.left = this._targetX + "px";
    this._dragUpdateLoop = window.setTimeout(this._updateLocation.bind(this), 10);
  }

  /**
   * Handle mouse move during drag
   * @param {MouseEvent} e
   * @private
   */
  _dragMove(e) {
    e.preventDefault();
    let x = e.clientX - this._offset.left;
    let y = e.clientY - this._offset.top;
    this._targetX = x;
    this._targetY = y;
    this._clampTarget();
  }

  /**
   * Complete drag operation
   * @private
   */
  _finishDrag() {
    window.clearTimeout(this._dragUpdateLoop);
    // @ts-expect-error
    window.removeEventListener("mousemove", this._moveHandle);
    // @ts-expect-error
    window.removeEventListener("mouseup", this._upHandle);

    this._balloon.show();
    this.reposition();
    this.resume();
  }

  /**
   * Clamp x/y to keep the agent within viewport bounds
   * @private
   */
  _clampTarget() {
    let m = 5;
    let bW = this._el.offsetWidth;
    let bH = this._el.offsetHeight;
    let wW = window.innerWidth;
    let wH = window.innerHeight;

    this._targetX = Math.max(m, Math.min(this._targetX, wW - bW - m));
    this._targetY = Math.max(m, Math.min(this._targetY, wH - bH - m));
  }

  /**
   * Clamp coordinates to keep the agent within viewport bounds
   * @private
   */
  _clampXY(x: number, y: number): { x: number; y: number } {
    let m = 5;
    let bW = this._el.offsetWidth;
    let bH = this._el.offsetHeight;
    let wW = window.innerWidth;
    let wH = window.innerHeight;

    return {
      x: Math.max(m, Math.min(x, wW - bW - m)),
      y: Math.max(m, Math.min(y, wH - bH - m)),
    };
  }

  /**
   * Add a function to the action queue
   * @param {Function} func - Function to queue
   * @param {Object} [scope] - Scope to bind function to
   * @private
   */
  _addToQueue(func, scope?: any) {
    if (scope) func = func.bind(scope);
    this._queue.queue(func);
  }

  _speakTTS(text: string) {
    if (!this._tts || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replaceAll("\n", " "));
    utterance.rate = this._tts.rate;
    utterance.pitch = this._tts.pitch;
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      const match = voices.find((v) => v.name.includes(this._tts!.voice));
      if (match) utterance.voice = match;
      speechSynthesis.speak(utterance);
    } else {
      // Voices not loaded yet (first page load) — wait for them
      speechSynthesis.addEventListener(
        "voiceschanged",
        () => {
          const v = speechSynthesis.getVoices();
          const match = v.find((voice) => voice.name.includes(this._tts!.voice));
          if (match) utterance.voice = match;
          speechSynthesis.speak(utterance);
        },
        { once: true },
      );
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this._resizeHandle);
    window.clearTimeout(this._dragUpdateLoop);
    // @ts-expect-error
    window.removeEventListener("mousemove", this._moveHandle);
    // @ts-expect-error
    window.removeEventListener("mouseup", this._upHandle);
    this._animator.dispose();
    this._balloon.dispose();
    this._queue.dispose();
    this._el.remove();
  }

  /**
   * Pause animations and balloon
   */
  pause() {
    this._animator.pause();
    this._balloon.pause();
  }

  /**
   * Resume animations and balloon
   */
  resume() {
    this._animator.resume();
    this._balloon.resume();
  }
}

export async function initAgent(loaders: AgentLoaders): Promise<Agent> {
  const [{ default: data }, { default: map }, sounds] = await Promise.all([
    loaders.agent(),
    loaders.map(),
    _loadSounds(loaders),
  ]);
  return new Agent(map, data, sounds);
}

async function _loadSounds(loaders: AgentLoaders): Promise<Record<string, string>> {
  const audio = document.createElement("audio");
  const canPlayMp3 = !!audio.canPlayType && audio.canPlayType("audio/mp3") !== "";
  if (!canPlayMp3) return {};
  const m = await loaders.sound();
  return m.default;
}
