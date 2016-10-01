function loadAudio(src, cb, err) {
    var audio = new Audio(src);
    audio.autoplay = false;
    audio.didcb = false;

    audio.oncanplaythrough = function() {
        if (!this.didcb) {
            this.didcb = true;
            cb(this);
        }
    };

    if (err) {
        audio.onerror = function(e) {
            err(e);
        };
    }
}

function Song(audio, loop) {
    this.audio = audio;
    this.audio.loop = loop;
}

Song.load = function(src, cb, err, loop) {
    loop = loop || false;

    loadAudio(src, function(audio) {
        cb(new Song(audio, loop));
    }, err);
};

Song.prototype.currentTime =
Song.prototype.time = function() {
    return this.audio.currentTime;
};

Song.prototype.setCurrentTime =
Song.prototype.setTime =
Song.prototype.seek = function(seconds) {
    this.audio.currentTime = seconds;
    return seconds;
};

Song.prototype.length =
Song.prototype.duration = function() {
    return this.audio.duration;
};

Song.prototype.ended = function() {
    return this.audio.ended;
};

Song.prototype.loops = function() {
    return this.audio.loop;
};

Song.prototype.setLoops = function(l) {
    this.audio.loop = l;
    return l;
};

Song.prototype.mute = function() {
    this.audio.muted = true;
    return true;
};

Song.prototype.unmute = function() {
    this.audio.muted = false;
    return false;
};

Song.prototype.setMuted = function(m) {
    this.audio.muted = m;
    return m;
};

Song.prototype.muted = function() {
    return this.audio.muted;
};

Song.prototype.paused = function() {
    return this.audio.paused;
};

Song.prototype.src =
Song.prototype.source = function() {
    return this.audio.src;
};

Song.prototype.play = function() {
    this.audio.play();
};

Song.prototype.pause = function() {
    this.audio.pause();
    return this.audio.currentTime;
};

Song.prototype.stop = function() {
    this.audio.pause();
    this.audio.currentTime = 0;
    return 0;
};

Song.prototype.volume = function() {
    return this.audio.volume;
};

Song.prototype.setVolume = function(v) {
    this.audio.volume = v;
    return v;
};

window.addEventListener("load", function() {
    if (Sequence) {
        Song.prototype.fadeOut = function(state, duration) {
            var self = this;
            var s = new Sequence(state);
            var v = this.volume();

            s.append(function(x) {
                self.setVolume.call(self, x);
            }, v, 0, duration, function() {
                self.stop.call(self);
                self.setVolume(v);
            });
            s.run();
        };

        Song.prototype.fadeIn = function(state, duration, maxVolume) {
            var self = this;
            var s = new Sequence(state);

            s.append(function(x) {
                self.setVolume.call(self, x);
            }, 0, maxVolume, duration, function() {
                self.setVolume(maxVolume);
            });

            this.setVolume(0);
            this.play();
            s.run();
        }
    }
});