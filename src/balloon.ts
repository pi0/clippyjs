/**
 * Balloon class for displaying speech bubbles next to the agent
 */
export default class Balloon {
  _targetEl: HTMLElement;
  _balloon: HTMLDivElement;
  _content: HTMLDivElement;
  _tip: HTMLDivElement;
  _hidden: boolean;
  _active: boolean;
  _hold: boolean;
  _hiding: number | null;
  WORD_SPEAK_TIME: number;
  CLOSE_BALLOON_DELAY: number;
  _BALLOON_MARGIN: number;
  _complete: Function;
  _addWord: Function | undefined;
  _loop: number | undefined;

  /**
   * @param {HTMLElement} targetEl - The agent element to attach the balloon to
   */
  constructor(targetEl) {
    this._targetEl = targetEl;
    this._hidden = true;
    this._setup();
    this.WORD_SPEAK_TIME = 200;
    this.CLOSE_BALLOON_DELAY = 2000;
    this._BALLOON_MARGIN = 15;
  }

  /**
   * Create and append balloon DOM elements
   * @private
   */
  _setup() {
    this._balloon = document.createElement("div");
    Object.assign(this._balloon.style, {
      position: "fixed",
      zIndex: "10001",
      cursor: "pointer",
      background: "#ffc",
      color: "black",
      padding: "8px",
      border: "1px solid black",
      borderRadius: "5px",
      display: "none",
    });

    this._tip = document.createElement("div");
    Object.assign(this._tip.style, {
      width: "10px",
      height: "16px",
      background:
        "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAgCAMAAAAlvKiEAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAAlQTFRF///MAAAA////52QwgAAAAAN0Uk5T//8A18oNQQAAAGxJREFUeNqs0kEOwCAIRFHn3//QTUU6xMyyxii+jQosrTPkyPEM6IN3FtzIRk1U4dFeKWQiH6pRRowMVKEmvronEynkwj0uZJgR22+YLopPSo9P34wJSamLSU7lSIWLJU7NkNomNlhqxUeAAQC+TQLZyEuJBwAAAABJRU5ErkJggg==) no-repeat",
      position: "absolute",
    });

    this._content = document.createElement("div");
    Object.assign(this._content.style, {
      maxWidth: "200px",
      minWidth: "120px",
      fontFamily: '"Microsoft Sans", sans-serif',
      fontSize: "10pt",
    });

    this._balloon.appendChild(this._tip);
    this._balloon.appendChild(this._content);

    document.body.appendChild(this._balloon);
  }

  /**
   * Try different positions to keep balloon on screen
   */
  reposition() {
    let sides = ["top-left", "top-right", "bottom-left", "bottom-right"];

    for (let i = 0; i < sides.length; i++) {
      let s = sides[i];
      this._position(s);
      if (!this._isOut()) break;
    }
  }

  /**
   * Position the balloon relative to the agent
   * @param {string} side - One of: top-left, top-right, bottom-left, bottom-right
   * @private
   */
  _position(side) {
    let o = this._targetEl.getBoundingClientRect();
    let h = this._targetEl.offsetHeight;
    let w = this._targetEl.offsetWidth;

    let bH = this._balloon.offsetHeight;
    let bW = this._balloon.offsetWidth;

    let left, top;
    switch (side) {
      case "top-left":
        left = o.left + w - bW;
        top = o.top - bH - this._BALLOON_MARGIN;
        break;
      case "top-right":
        left = o.left;
        top = o.top - bH - this._BALLOON_MARGIN;
        break;
      case "bottom-right":
        left = o.left;
        top = o.top + h + this._BALLOON_MARGIN;
        break;
      case "bottom-left":
        left = o.left + w - bW;
        top = o.top + h + this._BALLOON_MARGIN;
        break;
    }

    this._balloon.style.top = top + "px";
    this._balloon.style.left = left + "px";
    this._positionTip(side);
  }

  /**
   * Apply inline styles to the tip element based on balloon side
   * @param {string} side - One of: top-left, top-right, bottom-left, bottom-right
   * @private
   */
  _positionTip(side) {
    const s = this._tip.style;
    // Reset tip position
    s.top = "";
    s.left = "";
    s.marginTop = "";
    s.marginLeft = "";
    s.backgroundPosition = "";

    switch (side) {
      case "top-left":
        s.top = "100%";
        s.marginTop = "0px";
        s.left = "100%";
        s.marginLeft = "-50px";
        break;
      case "top-right":
        s.top = "100%";
        s.marginTop = "0px";
        s.left = "0";
        s.marginLeft = "50px";
        s.backgroundPosition = "-10px 0";
        break;
      case "bottom-right":
        s.top = "0";
        s.marginTop = "-16px";
        s.left = "0";
        s.marginLeft = "50px";
        s.backgroundPosition = "-10px -16px";
        break;
      case "bottom-left":
        s.top = "0";
        s.marginTop = "-16px";
        s.left = "100%";
        s.marginLeft = "-50px";
        s.backgroundPosition = "0px -16px";
        break;
    }
  }

  /**
   * Check if balloon is positioned outside the viewport
   * @returns {boolean}
   * @private
   */
  _isOut() {
    let o = this._balloon.getBoundingClientRect();
    let bH = this._balloon.offsetHeight;
    let bW = this._balloon.offsetWidth;

    let wW = window.innerWidth;
    let wH = window.innerHeight;

    let top = o.top;
    let left = o.left;
    let m = 5;
    if (top - m < 0 || left - m < 0) return true;
    return top + bH + m > wH || left + bW + m > wW;
  }

  /**
   * Display text in the balloon with typewriter effect
   * @param {Function} complete - Callback when speaking is done
   * @param {string} text - Text to display
   * @param {boolean} hold - If true, keep balloon open after speaking
   */
  speak(complete, text, hold) {
    this._hidden = false;
    this.show();
    let c = this._content;

    // Measure the text dimensions by temporarily setting it
    c.style.height = "auto";
    c.style.width = "auto";
    c.textContent = text;
    c.style.height = c.offsetHeight + "px";
    c.style.width = c.offsetWidth + "px";
    c.textContent = "";
    this.reposition();

    this._complete = complete;
    this._sayWords(text, hold, complete);
  }

  /**
   * Show the balloon
   */
  show() {
    if (this._hidden) return;
    this._balloon.style.display = "block";
  }

  /**
   * Hide the balloon
   * @param {boolean} fast - If true, hide immediately without delay
   */
  hide(fast?: boolean) {
    if (fast) {
      this._balloon.style.display = "none";
      return;
    }

    this._hiding = window.setTimeout(this._finishHideBalloon.bind(this), this.CLOSE_BALLOON_DELAY);
  }

  /**
   * Complete the hide operation
   * @private
   */
  _finishHideBalloon() {
    if (this._active) return;
    this._balloon.style.display = "none";
    this._hidden = true;
    this._hiding = null;
  }

  /**
   * Animate text appearing word by word
   * @param {string} text - Text to animate
   * @param {boolean} hold - If true, keep balloon open after speaking
   * @param {Function} complete - Callback when animation is done
   * @private
   */
  _sayWords(text, hold, complete) {
    this._active = true;
    this._hold = hold;
    let words = text.split(/[^\S-]/);
    let time = this.WORD_SPEAK_TIME;
    let el = this._content;
    let idx = 1;

    this._addWord = () => {
      if (!this._active) return;
      if (idx > words.length) {
        delete this._addWord;
        this._active = false;
        if (!this._hold) {
          complete();
          this.hide();
        }
      } else {
        el.textContent = words.slice(0, idx).join(" ");
        idx++;
        this._loop = window.setTimeout(this._addWord, time);
      }
    };

    this._addWord();
  }

  /**
   * Close the balloon and trigger completion callback if held
   */
  close() {
    if (this._active) {
      this._hold = false;
    } else if (this._hold) {
      this._complete();
    }
  }

  /**
   * Pause the balloon animation and hide timer
   */
  pause() {
    window.clearTimeout(this._loop);
    if (this._hiding) {
      window.clearTimeout(this._hiding);
      this._hiding = null;
    }
  }

  /**
   * Resume the balloon animation or hide timer
   */
  resume() {
    if (this._addWord) {
      this._addWord();
    } else if (!this._hold && !this._hidden) {
      this._hiding = window.setTimeout(
        this._finishHideBalloon.bind(this),
        this.CLOSE_BALLOON_DELAY,
      );
    }
  }

  dispose() {
    window.clearTimeout(this._loop);
    if (this._hiding) {
      window.clearTimeout(this._hiding);
      this._hiding = null;
    }
    this._active = false;
    this._addWord = undefined;
    this._balloon.remove();
  }
}
