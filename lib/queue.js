import $ from 'jquery'

export default class Queue {
    constructor (onEmptyCallback) {
        this._queue = [];
        this._onEmptyCallback = onEmptyCallback;
    }

    /***
     *
     * @param {function(Function)} func
     * @returns {jQuery.Deferred}
     */
    queue (func) {
        this._queue.push(func);

        if (this._queue.length === 1 && !this._active) {
            this._progressQueue();
        }
    }

    _progressQueue () {

        // stop if nothing left in queue
        if (!this._queue.length) {
            this._onEmptyCallback();
            return;
        }

        let f = this._queue.shift();
        this._active = true;

        // execute function
        let completeFunction = $.proxy(this.next, this);
        f(completeFunction);
    }

    clear () {
        this._queue = [];
    }

    next () {
        this._active = false;
        this._progressQueue();
    }
}



