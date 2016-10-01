function Sequence(state) {
    this.state = state;
    this.queue = [];
    this.counter = 0;
    this.callback = undefined;
}

Sequence.prototype.append = function(fn, min, max, duration, callback) {
    this.queue.push({fn:fn,min:min,max:max,duration:duration,callback:callback});
};

Sequence.prototype.run = function(callback) {
    this.state.hookPreUpdate((function(thisarg) { return function(elapsed) { return thisarg.update(elapsed); }})(this));
    this.callback = callback;
};

Sequence.prototype.update = function(elapsed) {
    this.counter += elapsed;
    var q = this.queue[0];

    if (this.counter >= q.duration) {
        while (this.counter >= q.duration) this.counter -= q.duration;
        if (q.callback) q.callback.call(this.state);

        this.queue.shift();

        if (this.queue.length === 0) {
            if (this.callback) this.callback();
            return false; // unhooks, nice feature btw past songsing very forward-thinking
        }

        q = this.queue[0];
    }

    q.fn.call(this.state, q.min + (this.counter / q.duration) * (q.max - q.min));

    return true;
};

Sequence.prototype.skipCurrent = function(doCallbackAnyway) {
    if (doCallbackAnyway === undefined) doCallbackAnyway = false;

    var q = this.queue[0];

    while (this.counter >= q.duration) this.counter -= q.duration;
    if (q.callback && doCallbackAnyway) q.callback.call(this.state);

    this.queue.shift();

    if (this.queue.length === 0) {
        if (this.callback) this.callback();
        return false;
    }

    return true;
};

Sequence.prototype.skip = function(n, doCallbacksAnyway) {
    if (n === undefined) n = 1;
    if (doCallbacksAnyway === undefined) doCallbacksAnyway = false;

    for (var i = 0; i < n; i++) {
        if (!this.skipCurrent()) {
            return false;
        }
    }

    return true;
};