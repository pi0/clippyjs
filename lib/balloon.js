import $ from 'jquery'

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

        this._balloon = $('<div class="clippy-balloon"><div class="clippy-tip"></div><div class="clippy-content"></div></div> ').hide();
        this._content = this._balloon.find('.clippy-content');

        $(document.body).append(this._balloon);
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
        let o = this._targetEl.offset();
        let h = this._targetEl.height();
        let w = this._targetEl.width();
        o.top -= $(window).scrollTop();
        o.left -= $(window).scrollLeft();

        let bH = this._balloon.outerHeight();
        let bW = this._balloon.outerWidth();

        this._balloon.removeClass('clippy-top-left');
        this._balloon.removeClass('clippy-top-right');
        this._balloon.removeClass('clippy-bottom-right');
        this._balloon.removeClass('clippy-bottom-left');

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

        this._balloon.css({ top: top, left: left });
        this._balloon.addClass('clippy-' + side);
    }

    _isOut () {
        let o = this._balloon.offset();
        let bH = this._balloon.outerHeight();
        let bW = this._balloon.outerWidth();

        let wW = $(window).width();
        let wH = $(window).height();
        let sT = $(document).scrollTop();
        let sL = $(document).scrollLeft();

        let top = o.top - sT;
        let left = o.left - sL;
        let m = 5;
        if (top - m < 0 || left - m < 0) return true;
        return (top + bH + m) > wH || (left + bW + m) > wW;
    }

    speak (complete, text, hold) {
        this._hidden = false;
        this.show();
        let c = this._content;
        // set height to auto
        c.height('auto');
        c.width('auto');
        // add the text
        c.text(text);
        // set height
        c.height(c.height());
        c.width(c.width());
        c.text('');
        this.reposition();

        this._complete = complete;
        this._sayWords(text, hold, complete);
    }

    show () {
        if (this._hidden) return;
        this._balloon.show();
    }

    hide (fast) {
        if (fast) {
            this._balloon.hide();
            return;
        }

        this._hiding = window.setTimeout($.proxy(this._finishHideBalloon, this), this.CLOSE_BALLOON_DELAY);
    }

    _finishHideBalloon () {
        if (this._active) return;
        this._balloon.hide();
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


        this._addWord = $.proxy(function () {
            if (!this._active) return;
            if (idx > words.length) {
                delete this._addWord;
                this._active = false;
                if (!this._hold) {
                    complete();
                    this.hide();
                }
            } else {
                el.text(words.slice(0, idx).join(' '));
                idx++;
                this._loop = window.setTimeout($.proxy(this._addWord, this), time);
            }
        }, this);

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
            this._hiding = window.setTimeout($.proxy(this._finishHideBalloon, this), this.CLOSE_BALLOON_DELAY);
        }
    }
}


