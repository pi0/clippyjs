/**
 * Balloon class for displaying speech bubbles next to the agent
 */
export default class Balloon {
    /**
     * @param {HTMLElement} targetEl - The agent element to attach the balloon to
     */
    constructor (targetEl) {
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
    _setup () {
        this._balloon = document.createElement('div');
        this._balloon.className = 'clippy-balloon';
        this._balloon.style.display = 'none';

        const tip = document.createElement('div');
        tip.className = 'clippy-tip';

        this._content = document.createElement('div');
        this._content.className = 'clippy-content';

        this._balloon.appendChild(tip);
        this._balloon.appendChild(this._content);

        document.body.appendChild(this._balloon);
    }

    /**
     * Try different positions to keep balloon on screen
     */
    reposition () {
        let sides = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

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
    _position (side) {
        let o = this._targetEl.getBoundingClientRect();
        let h = this._targetEl.offsetHeight;
        let w = this._targetEl.offsetWidth;

        let bH = this._balloon.offsetHeight;
        let bW = this._balloon.offsetWidth;

        this._balloon.classList.remove('clippy-top-left', 'clippy-top-right', 'clippy-bottom-right', 'clippy-bottom-left');

        let left, top;
        switch (side) {
            case 'top-left':
                left = o.left + w - bW;
                top = o.top - bH - this._BALLOON_MARGIN;
                break;
            case 'top-right':
                left = o.left;
                top = o.top - bH - this._BALLOON_MARGIN;
                break;
            case 'bottom-right':
                left = o.left;
                top = o.top + h + this._BALLOON_MARGIN;
                break;
            case 'bottom-left':
                left = o.left + w - bW;
                top = o.top + h + this._BALLOON_MARGIN;
                break;
        }

        this._balloon.style.top = top + 'px';
        this._balloon.style.left = left + 'px';
        this._balloon.classList.add('clippy-' + side);
    }

    /**
     * Check if balloon is positioned outside the viewport
     * @returns {boolean}
     * @private
     */
    _isOut () {
        let o = this._balloon.getBoundingClientRect();
        let bH = this._balloon.offsetHeight;
        let bW = this._balloon.offsetWidth;

        let wW = window.innerWidth;
        let wH = window.innerHeight;

        let top = o.top;
        let left = o.left;
        let m = 5;
        if (top - m < 0 || left - m < 0) return true;
        return (top + bH + m) > wH || (left + bW + m) > wW;
    }

    /**
     * Display text in the balloon with typewriter effect
     * @param {Function} complete - Callback when speaking is done
     * @param {string} text - Text to display
     * @param {boolean} hold - If true, keep balloon open after speaking
     */
    speak (complete, text, hold) {
        this._hidden = false;
        this.show();
        let c = this._content;

        // Measure the text dimensions by temporarily setting it
        c.style.height = 'auto';
        c.style.width = 'auto';
        c.textContent = text;
        c.style.height = c.offsetHeight + 'px';
        c.style.width = c.offsetWidth + 'px';
        c.textContent = '';
        this.reposition();

        this._complete = complete;
        this._sayWords(text, hold, complete);
    }

    /**
     * Show the balloon
     */
    show () {
        if (this._hidden) return;
        this._balloon.style.display = 'block';
    }

    /**
     * Hide the balloon
     * @param {boolean} fast - If true, hide immediately without delay
     */
    hide (fast) {
        if (fast) {
            this._balloon.style.display = 'none';
            return;
        }

        this._hiding = window.setTimeout(this._finishHideBalloon.bind(this), this.CLOSE_BALLOON_DELAY);
    }

    /**
     * Complete the hide operation
     * @private
     */
    _finishHideBalloon () {
        if (this._active) return;
        this._balloon.style.display = 'none';
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
    _sayWords (text, hold, complete) {
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
                el.textContent = words.slice(0, idx).join(' ');
                idx++;
                this._loop = window.setTimeout(this._addWord.bind(this), time);
            }
        };

        this._addWord();
    }

    /**
     * Close the balloon and trigger completion callback if held
     */
    close () {
        if (this._active) {
            this._hold = false;
        } else if (this._hold) {
            this._complete();
        }
    }

    /**
     * Pause the balloon animation and hide timer
     */
    pause () {
        window.clearTimeout(this._loop);
        if (this._hiding) {
            window.clearTimeout(this._hiding);
            this._hiding = null;
        }
    }

    /**
     * Resume the balloon animation or hide timer
     */
    resume () {
        if (this._addWord) {
            this._addWord();
        } else if (!this._hold && !this._hidden) {
            this._hiding = window.setTimeout(this._finishHideBalloon.bind(this), this.CLOSE_BALLOON_DELAY);
        }
    }
}