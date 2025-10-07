export default class Balloon {
    constructor (targetEl) {
        this._targetEl = targetEl;

        this._hidden = true;
        this._setup();
        this.WORD_SPEAK_TIME = 200;
        this.CLOSE_BALLOON_DELAY = 2000;
        this._BALLOON_MARGIN = 15;
    }

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

    reposition () {
        let sides = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

        for (let i = 0; i < sides.length; i++) {
            let s = sides[i];
            this._position(s);
            if (!this._isOut()) break;
        }
    }

    /***
     *
     * @param side
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
                // right side of the balloon next to the right side of the agent
                left = o.left + w - bW;
                top = o.top - bH - this._BALLOON_MARGIN;
                break;
            case 'top-right':
                // left side of the balloon next to the left side of the agent
                left = o.left;
                top = o.top - bH - this._BALLOON_MARGIN;
                break;
            case 'bottom-right':
                // right side of the balloon next to the right side of the agent
                left = o.left;
                top = o.top + h + this._BALLOON_MARGIN;
                break;
            case 'bottom-left':
                // left side of the balloon next to the left side of the agent
                left = o.left + w - bW;
                top = o.top + h + this._BALLOON_MARGIN;
                break;
        }

        this._balloon.style.top = top + 'px';
        this._balloon.style.left = left + 'px';
        this._balloon.classList.add('clippy-' + side);
    }

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

    speak (complete, text, hold) {
        this._hidden = false;
        this.show();
        let c = this._content;
        // set height to auto
        c.style.height = 'auto';
        c.style.width = 'auto';
        // add the text
        c.textContent = text;
        // set height
        c.style.height = c.offsetHeight + 'px';
        c.style.width = c.offsetWidth + 'px';
        c.textContent = '';
        this.reposition();

        this._complete = complete;
        this._sayWords(text, hold, complete);
    }

    show () {
        if (this._hidden) return;
        this._balloon.style.display = 'block';
    }

    hide (fast) {
        if (fast) {
            this._balloon.style.display = 'none';
            return;
        }

        this._hiding = window.setTimeout(this._finishHideBalloon.bind(this), this.CLOSE_BALLOON_DELAY);
    }

    _finishHideBalloon () {
        if (this._active) return;
        this._balloon.style.display = 'none';
        this._hidden = true;
        this._hiding = null;
    }

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

    close () {
        if (this._active) {
            this._hold = false;
        } else if (this._hold) {
            this._complete();
        }
    }

    pause () {
        window.clearTimeout(this._loop);
        if (this._hiding) {
            window.clearTimeout(this._hiding);
            this._hiding = null;
        }
    }

    resume () {
        if (this._addWord) {
            this._addWord();
        } else if (!this._hold && !this._hidden) {
            this._hiding = window.setTimeout(this._finishHideBalloon.bind(this), this.CLOSE_BALLOON_DELAY);
        }
    }
}