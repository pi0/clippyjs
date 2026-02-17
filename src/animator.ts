/**
 * Animator class handles frame-by-frame animation playback using sprite sheets
 */
export default class Animator {
  _el: HTMLElement;
  _data: any;
  _path: string;
  _currentFrameIndex: number;
  _currentFrame: any;
  _exiting: boolean;
  _currentAnimation: any;
  _endCallback: Function | undefined;
  _started: boolean;
  _sounds: { [key: string]: HTMLAudioElement };
  currentAnimationName: string | undefined;
  _overlays: HTMLElement[];
  _loop: number | undefined;
  static States: { WAITING: number; EXITED: number };

  /**
   * @param {HTMLElement} el - The element to animate
   * @param {string} path - Path to the agent's asset directory
   * @param {Object} data - Agent animation data (frames, overlays, sounds)
   * @param {Object} sounds - Map of sound names to audio URLs
   */
  constructor(el, path, data, sounds) {
    this._el = el;
    this._data = data;
    this._path = path;
    this._currentFrameIndex = 0;
    this._currentFrame = undefined;
    this._exiting = false;
    this._currentAnimation = undefined;
    this._endCallback = undefined;
    this._started = false;
    this._sounds = {};
    this.currentAnimationName = undefined;
    this.preloadSounds(sounds);
    this._overlays = [this._el];
    let curr = this._el;

    this._setupElement(this._el);

    // Create overlay elements for multi-layer animations
    for (let i = 1; i < this._data.overlayCount; i++) {
      let inner = this._setupElement(document.createElement("div"));
      curr.appendChild(inner);
      this._overlays.push(inner);
      curr = inner;
    }
  }

  /**
   * Configure an element for sprite sheet animation
   * @param {HTMLElement} el - Element to setup
   * @returns {HTMLElement}
   * @private
   */
  _setupElement(el) {
    let frameSize = this._data.framesize;
    el.style.display = "none";
    el.style.width = frameSize[0] + "px";
    el.style.height = frameSize[1] + "px";
    el.style.background = "url('" + this._path + "/map.png') no-repeat";

    return el;
  }

  /**
   * Get list of all available animation names
   * @returns {string[]}
   */
  animations() {
    let r = [];
    let d = this._data.animations;
    for (let n in d) {
      r.push(n);
    }
    return r;
  }

  /**
   * Preload audio files for animations
   * @param {Object} sounds - Map of sound names to URLs
   */
  preloadSounds(sounds) {
    for (let i = 0; i < this._data.sounds.length; i++) {
      let snd = this._data.sounds[i];
      let uri = sounds[snd];
      if (!uri) continue;
      this._sounds[snd] = new Audio(uri);
    }
  }

  /**
   * Check if an animation exists
   * @param {string} name - Animation name
   * @returns {boolean}
   */
  hasAnimation(name) {
    return !!this._data.animations[name];
  }

  /**
   * Signal that current animation should exit at next opportunity
   */
  exitAnimation() {
    this._exiting = true;
  }

  /**
   * Start playing an animation
   * @param {string} animationName - Name of the animation to play
   * @param {Function} stateChangeCallback - Called with (name, state) when animation state changes
   * @returns {boolean} - True if animation exists and was started
   */
  showAnimation(animationName, stateChangeCallback) {
    this._exiting = false;

    if (!this.hasAnimation(animationName)) {
      return false;
    }

    this._currentAnimation = this._data.animations[animationName];
    this.currentAnimationName = animationName;

    if (!this._started) {
      this._step();
      this._started = true;
    }

    this._currentFrameIndex = 0;
    this._currentFrame = undefined;
    this._endCallback = stateChangeCallback;

    return true;
  }

  /**
   * Render the current frame by positioning sprite sheet backgrounds
   * @private
   */
  _draw() {
    let images = [];
    if (this._currentFrame) images = this._currentFrame.images || [];

    for (let i = 0; i < this._overlays.length; i++) {
      if (i < images.length) {
        let xy = images[i];
        let bg = -xy[0] + "px " + -xy[1] + "px";
        this._overlays[i].style.backgroundPosition = bg;
        this._overlays[i].style.display = "block";
      } else {
        this._overlays[i].style.display = "none";
      }
    }
  }

  /**
   * Determine the next frame index based on branching logic
   * @returns {number|undefined}
   * @private
   */
  _getNextAnimationFrame() {
    if (!this._currentAnimation) return undefined;
    if (!this._currentFrame) return 0;

    let currentFrame = this._currentFrame;
    let branching = this._currentFrame.branching;

    // Exit branching takes priority
    if (this._exiting && currentFrame.exitBranch !== undefined) {
      return currentFrame.exitBranch;
    }
    // Weighted random branching
    else if (branching) {
      let rnd = Math.random() * 100;
      for (let i = 0; i < branching.branches.length; i++) {
        let branch = branching.branches[i];
        if (rnd <= branch.weight) {
          return branch.frameIndex;
        }
        rnd -= branch.weight;
      }
    }

    return this._currentFrameIndex + 1;
  }

  /**
   * Play the sound associated with the current frame
   * @private
   */
  _playSound() {
    let s = this._currentFrame.sound;
    if (!s) return;
    let audio = this._sounds[s];
    if (audio) {
      // Handle autoplay policy - catch and ignore errors when browser blocks autoplay
      audio.play().catch(() => {
        // Silently ignore autoplay errors - browser autoplay policy prevents playback
      });
    }
  }

  /**
   * Check if we're at the last frame of the animation
   * @returns {boolean}
   * @private
   */
  _atLastFrame() {
    return this._currentFrameIndex >= this._currentAnimation.frames.length - 1;
  }

  /**
   * Advance to the next animation frame
   * @private
   */
  _step() {
    if (!this._currentAnimation) return;

    let newFrameIndex = Math.min(
      this._getNextAnimationFrame(),
      this._currentAnimation.frames.length - 1,
    );
    let frameChanged = !this._currentFrame || this._currentFrameIndex !== newFrameIndex;
    this._currentFrameIndex = newFrameIndex;

    // Update frame data unless we're waiting at the last frame with exit branching
    if (!(this._atLastFrame() && this._currentAnimation.useExitBranching)) {
      this._currentFrame = this._currentAnimation.frames[this._currentFrameIndex];
    }

    this._draw();
    this._playSound();

    this._loop = window.setTimeout(this._step.bind(this), this._currentFrame.duration);

    // Fire callbacks when animation reaches an end state
    if (this._endCallback && frameChanged && this._atLastFrame()) {
      if (this._currentAnimation.useExitBranching && !this._exiting) {
        this._endCallback(this.currentAnimationName, Animator.States.WAITING);
      } else {
        this._endCallback(this.currentAnimationName, Animator.States.EXITED);
      }
    }
  }

  /**
   * Pause animation execution
   */
  pause() {
    window.clearTimeout(this._loop);
  }

  /**
   * Resume animation
   */
  resume() {
    this._step();
  }
}

/**
 * Animation state constants
 * @enum {number}
 */
Animator.States = {
  WAITING: 1, // Animation is waiting (e.g., for movement to complete)
  EXITED: 0, // Animation has completed and exited
};
