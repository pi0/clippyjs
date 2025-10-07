import Queue from './queue'
import Animator from './animator'
import Balloon from './balloon'

export default class Agent {

    constructor (path, data, sounds) {
        this.path = path;

        this._queue = new Queue(this._onQueueEmpty.bind(this));

        this._el = document.createElement('div');
        this._el.className = 'clippy';
        this._el.style.display = 'none';

        document.body.appendChild(this._el);

        this._animator = new Animator(this._el, path, data, sounds);

        this._balloon = new Balloon(this._el);

        this._setupEvents();
    }

    /***
     *
     * @param {Number} x
     * @param {Number} y
     */
    gestureAt (x, y) {
        let d = this._getDirection(x, y);
        let gAnim = 'Gesture' + d;
        let lookAnim = 'Look' + d;

        let animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
        return this.play(animation);
    }

    /***
     *
     * @param {Boolean=} fast
     *
     */
    hide (fast, callback) {
        this._hidden = true;
        let el = this._el;
        this.stop();
        if (fast) {
            this._el.style.display = 'none';
            this.stop();
            this.pause();
            if (callback) callback();
            return;
        }

        return this._playInternal('Hide', function () {
            el.style.display = 'none';
            this.pause();
            if (callback) callback();
        })
    }


    moveTo (x, y, duration) {
        let dir = this._getDirection(x, y);
        let anim = 'Move' + dir;
        if (duration === undefined) duration = 1000;

        this._addToQueue(function (complete) {
            // the simple case
            if (duration === 0) {
                this._el.style.top = y + 'px';
                this._el.style.left = x + 'px';
                this.reposition();
                complete();
                return;
            }

            // no animations
            if (!this.hasAnimation(anim)) {
                this._animate(this._el, { top: y, left: x }, duration, complete);
                return;
            }

            let callback = (name, state) => {
                // when exited, complete
                if (state === Animator.States.EXITED) {
                    complete();
                }
                // if waiting,
                if (state === Animator.States.WAITING) {
                    this._animate(this._el, { top: y, left: x }, duration, () => {
                        // after we're done with the movement, do the exit animation
                        this._animator.exitAnimation();
                    });
                }
            };

            this._playInternal(anim, callback);
        }, this);
    }

    _animate(element, props, duration, callback) {
        const start = performance.now();
        const startProps = {};

        for (let prop in props) {
            const currentValue = parseFloat(getComputedStyle(element)[prop]) || 0;
            startProps[prop] = currentValue;
        }

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            for (let prop in props) {
                const startValue = startProps[prop];
                const endValue = props[prop];
                const currentValue = startValue + (endValue - startValue) * progress;
                element.style[prop] = currentValue + 'px';
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (callback) {
                callback();
            }
        };

        requestAnimationFrame(animate);
    }

    _playInternal (animation, callback) {

        // if we're inside an idle animation,
        if (this._isIdleAnimation() && this._idleDfd && this._idleDfd.state === 'pending') {
            this._idleDfd.then(() => {
                this._playInternal(animation, callback);
            });
        }

        this._animator.showAnimation(animation, callback);
    }

    play (animation, timeout, cb) {
        if (!this.hasAnimation(animation)) return false;

        if (timeout === undefined) timeout = 5000;


        this._addToQueue(function (complete) {
            let completed = false;
            // handle callback
            let callback = function (name, state) {
                if (state === Animator.States.EXITED) {
                    completed = true;
                    if (cb) cb();
                    complete();
                }
            };

            // if has timeout, register a timeout function
            if (timeout) {
                window.setTimeout(() => {
                    if (completed) return;
                    // exit after timeout
                    this._animator.exitAnimation();
                }, timeout)
            }

            this._playInternal(animation, callback);
        }, this);

        return true;
    }

    /***
     *
     * @param {Boolean=} fast
     */
    show (fast) {

        this._hidden = false;
        if (fast) {
            this._el.style.display = 'block';
            this.resume();
            this._onQueueEmpty();
            return;
        }

        if (this._el.style.top === 'auto' || this._el.style.left === 'auto') {
            let left = window.innerWidth * 0.8;
            let top = (window.innerHeight + window.pageYOffset) * 0.8;
            this._el.style.top = top + 'px';
            this._el.style.left = left + 'px';
        }

        this.resume();
        return this.play('Show');
    }

    /***
     *
     * @param {String} text
     */
    speak (text, hold) {
        this._addToQueue(function (complete) {
            this._balloon.speak(complete, text, hold);
        }, this);
    }


    /***
     * Close the current balloon
     */
    closeBalloon () {
        this._balloon.hide();
    }

    delay (time) {
        time = time || 250;

        this._addToQueue(function (complete) {
            this._onQueueEmpty();
            window.setTimeout(complete, time);
        });
    }

    /***
     * Skips the current animation
     */
    stopCurrent () {
        this._animator.exitAnimation();
        this._balloon.close();
    }


    stop () {
        // clear the queue
        this._queue.clear();
        this._animator.exitAnimation();
        this._balloon.hide();
    }

    /***
     *
     * @param {String} name
     * @returns {Boolean}
     */
    hasAnimation (name) {
        return this._animator.hasAnimation(name);
    }

    /***
     * Gets a list of animation names
     *
     * @return {Array.<string>}
     */
    animations () {
        return this._animator.animations();
    }

    /***
     * Play a random animation
     * @return {Boolean}
     */
    animate () {
        let animations = this.animations();
        let anim = animations[Math.floor(Math.random() * animations.length)];
        // skip idle animations
        if (anim.indexOf('Idle') === 0) {
            return this.animate();
        }
        return this.play(anim);
    }

    /**************************** Utils ************************************/

    /***
     *
     * @param {Number} x
     * @param {Number} y
     * @return {String}
     * @private
     */
    _getDirection (x, y) {
        let rect = this._el.getBoundingClientRect();
        let h = this._el.offsetHeight;
        let w = this._el.offsetWidth;

        let centerX = (rect.left + w / 2);
        let centerY = (rect.top + h / 2);


        let a = centerY - y;
        let b = centerX - x;

        let r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

        // Left and Right are for the character, not the screen :-/
        if (-45 <= r && r < 45) return 'Right';
        if (45 <= r && r < 135) return 'Up';
        if (135 <= r && r <= 180 || -180 <= r && r < -135) return 'Left';
        if (-135 <= r && r < -45) return 'Down';

        // sanity check
        return 'Top';
    }

    /**************************** Queue and Idle handling ************************************/

    /***
     * Handle empty queue.
     * We need to transition the animation to an idle state
     * @private
     */
    _onQueueEmpty () {
        if (this._hidden || this._isIdleAnimation()) return;
        let idleAnim = this._getIdleAnimation();
        this._idleDfd = this._createDeferred();

        this._animator.showAnimation(idleAnim, this._onIdleComplete.bind(this));
    }

    _createDeferred() {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        promise.resolve = resolve;
        promise.reject = reject;
        promise.state = 'pending';
        promise.then(() => { promise.state = 'resolved'; }, () => { promise.state = 'rejected'; });
        return promise;
    }

    _onIdleComplete (name, state) {
        if (state === Animator.States.EXITED) {
            this._idleDfd.resolve();
        }
    }

    /***
     * Is the current animation is Idle?
     * @return {Boolean}
     * @private
     */
    _isIdleAnimation () {
        let c = this._animator.currentAnimationName;
        return c && c.indexOf('Idle') === 0;
    }


    /**
     * Gets a random Idle animation
     * @return {String}
     * @private
     */
    _getIdleAnimation () {
        let animations = this.animations();
        let r = [];
        for (let i = 0; i < animations.length; i++) {
            let a = animations[i];
            if (a.indexOf('Idle') === 0) {
                r.push(a);
            }
        }

        // pick one
        let idx = Math.floor(Math.random() * r.length);
        return r[idx];
    }

    /**************************** Events ************************************/

    _setupEvents () {
        window.addEventListener('resize', this.reposition.bind(this));

        this._el.addEventListener('mousedown', this._onMouseDown.bind(this));

        this._el.addEventListener('dblclick', this._onDoubleClick.bind(this));
    }

    _onDoubleClick () {
        if (!this.play('ClickedOn')) {
            this.animate();
        }
    }

    reposition () {
        if (this._el.style.display === 'none') return;
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
        } else if ((top + bH + m) > wH) {
            top = wH - bH - m;
        }

        if (left - m < 0) {
            left = m;
        } else if (left + bW + m > wW) {
            left = wW - bW - m;
        }

        this._el.style.left = left + 'px';
        this._el.style.top = top + 'px';
        // reposition balloon
        this._balloon.reposition();
    }

    _onMouseDown (e) {
        e.preventDefault();
        this._startDrag(e);
    }


    /**************************** Drag ************************************/

    _startDrag (e) {
        // pause animations
        this.pause();
        this._balloon.hide(true);
        this._offset = this._calculateClickOffset(e);

        this._moveHandle = this._dragMove.bind(this);
        this._upHandle = this._finishDrag.bind(this);

        window.addEventListener('mousemove', this._moveHandle);
        window.addEventListener('mouseup', this._upHandle);

        this._dragUpdateLoop = window.setTimeout(this._updateLocation.bind(this), 10);
    }

    _calculateClickOffset (e) {
        let mouseX = e.pageX;
        let mouseY = e.pageY;
        let o = this._el.getBoundingClientRect();
        return {
            top: mouseY - (o.top + window.pageYOffset),
            left: mouseX - (o.left + window.pageXOffset)
        }

    }

    _updateLocation () {
        this._el.style.top = this._targetY + 'px';
        this._el.style.left = this._targetX + 'px';
        this._dragUpdateLoop = window.setTimeout(this._updateLocation.bind(this), 10);
    }

    _dragMove (e) {
        e.preventDefault();
        let x = e.clientX - this._offset.left;
        let y = e.clientY - this._offset.top;
        this._targetX = x;
        this._targetY = y;
    }

    _finishDrag () {
        window.clearTimeout(this._dragUpdateLoop);
        // remove handles
        window.removeEventListener('mousemove', this._moveHandle);
        window.removeEventListener('mouseup', this._upHandle);
        // resume animations
        this._balloon.show();
        this.reposition();
        this.resume();

    }

    _addToQueue (func, scope) {
        if (scope) func = func.bind(scope);
        this._queue.queue(func);
    }

    /**************************** Pause and Resume ************************************/

    pause () {
        this._animator.pause();
        this._balloon.pause();

    }

    resume () {
        this._animator.resume();
        this._balloon.resume();
    }
}