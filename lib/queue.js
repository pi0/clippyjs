/**
 * Queue class for managing sequential async operations
 */
export default class Queue {
    /**
     * @param {Function} onEmptyCallback - Called when queue becomes empty
     */
    constructor (onEmptyCallback) {
        this._queue = [];
        this._onEmptyCallback = onEmptyCallback;
    }

    /**
     * Add a function to the queue
     * @param {Function} func - Function that receives a completion callback
     */
    queue (func) {
        this._queue.push(func);

        if (this._queue.length === 1 && !this._active) {
            this._progressQueue();
        }
    }

    /**
     * Process the next item in the queue
     * @private
     */
    _progressQueue () {
        if (!this._queue.length) {
            this._onEmptyCallback();
            return;
        }

        let f = this._queue.shift();
        this._active = true;

        let completeFunction = this.next.bind(this);
        f(completeFunction);
    }

    /**
     * Clear all items from the queue
     */
    clear () {
        this._queue = [];
    }

    /**
     * Mark current operation as complete and progress to next item
     */
    next () {
        this._active = false;
        this._progressQueue();
    }
}
