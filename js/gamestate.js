// TODO: this

function GameState() {
    this.entities = [];
    this.paused = false;
    this.isUpdating = false;
    this.removeQueue = [];
    this.preUpdates = [];
    this.postUpdates = [];
    this.preDraws = [];
    this.postDraws = [];
    this.canvas = undefined;

    this.__preUpdateRemoveQueue = [];
    this.__postUpdateRemoveQueue = [];

    this.pcounter = 0; // for pendulum -- not affected by anything play does
    this.lastpcounter = 0;
    this.pvelocity = 1; // left or right?
    this.goneAlready = false; // has player made a move on this tick already?
    this.state = "";
    this.missCounter = 0;
    this.score = 0;
    this.h = 1.5;
    this.scoreCap = 5000;
    this.bgcolor = [0,0,0];
    this.counter = 0;
    this.deltaScore = 0;
    this.scoreCounter = 0;
    this.scoreCounterMax = 750;
    this.hs = 0;
    this.tickSwitch = false;
} GameState.extends(State);

GameState.prototype.prepareAssets = function() {
    this.assets = {};

    this.__game.prepareAssetDirect("img/controls.png", loadImage, this, "controls");
    this.__game.prepareAssetDirect("img/clock.png", loadImage, this, "clock");
    this.__game.prepareAssetDirect("img/pendulum.png", loadImage, this, "pendulum");

    this.__game.prepareAsset("glyphs/ass", function(src, cb) {
        var f = new TextManager.Font(src, 96, "white", .5, .5, "black", 1, cb);
    }, function(font) {
        textManager.fonts.ass = font;
    });

    this.__game.prepareAsset("glyphs/ass", function(src, cb) {
        var f = new TextManager.Font(src, 48, "white", .5, .5, "black", 1, cb);
    }, function(font) {
        textManager.fonts.assMini = font;
    });

    this.__game.prepareAssetDirect("audio/tick.wav", Song.load, this, "tick");
    this.__game.prepareAssetDirect("audio/tock.wav", Song.load, this, "tock");
    this.__game.prepareAssetDirect("audio/softtheme.wav", Song.load, this, "softtheme");
};

GameState.prototype.start = function() {
    if (!Storage.hasKey("highscore")) {
        Storage.set("highscore", 0);
    }

    this.assets.softtheme.setVolume(0.2);
    this.assets.softtheme.setLoops(true);

    this.clocky = 25;
    this.pendy = this.clocky + this.assets.clock.height - 3;
    this.state = "";
    this.seq = new Sequence(this);

    this.seq.append(__emptyfn, 0, 1, 2000, function() { this.state = "pre"; });
    this.seq.run();

    this.hookPreUpdate(this._preUpdate);
    this.hookPreDraw(this._preDraw);
};

GameState.prototype._preUpdate = function(elapsed) {
    if (this.__game.keyPressed("primary") && this.__game.mouseStates[0] === true) {
        var p = this.__game.mousePosition;

        if (pointInRect(p, 49, 4, 54, 46)) {
            this.__game.soundMuted = !this.__game.soundMuted;
            titleState.assets.bleep.setMuted(this.__game.soundMuted);
            this.assets.tick.setMuted(this.__game.soundMuted);
            this.assets.tock.setMuted(this.__game.soundMuted);
            Storage.set("soundMuted", this.__game.soundMuted);
            return true;
        } else if (pointInRect(p, 7, 4, 37, 46)) {
            this.__game.musicMuted = !this.__game.musicMuted;
            titleState.assets.theme.setMuted(this.__game.musicMuted);
            titleState.assets.ffft.setMuted(this.__game.musicMuted);
            this.assets.softtheme.setMuted(this.__game.musicMuted);
            Storage.set("musicMuted", this.__game.musicMuted);
            return true;
        }
    }

    if (this.state === "pre" || this.state === "lose") {
        if (this.__game.keyPressed("primary")) {
            this.state = "running";

            this.pcounter = 0; // for pendulum -- not affected by anything play does
            this.lastpcounter = 0;
            this.pvelocity = 1; // left or right?
            this.goneAlready = false; // has player made a move on this tick already?
            this.missCounter = 0;
            this.score = 0;
            this.h = 1.5;
            this.scoreCap = 5000;
            this.bgcolor = [0,0,0];
            this.counter = 0;
            this.deltaScore = 0;
            this.scoreCounter = 0;

            this.assets.softtheme.play();
        }
    } else if (this.state === "running") {
        if (this.__game.keyPressed("primary")) {
            if (true) {
                this.goneAlready = true;
                this.missCounter = 0;
                var closeness = 500 - Math.abs(this.pcounter);
                this.addScore((closeness / this.h) - ((500 - closeness) * this.h));

                //console.log(closeness);

                this.counter++;
                this.r = randomInt(0, 100);

                if (this.score < 0) {
                    this.lose();
                }

            }
        }

        if (this.scoreCounter > 0) {
            this.scoreCounter -= elapsed;
        }

        this.pcounter += elapsed * this.pvelocity;

        if (Math.abs(this.pcounter) > 500) {
            this.pcounter = (500 - (Math.abs(this.pcounter) - 500)) * this.pvelocity;
            this.pvelocity *= -1;
        } else if ((this.pcounter >= 0 && this.lastpcounter < 0) || (this.pcounter <= 0 && this.lastpcounter > 0)) {
            if (!this.goneAlready) {
                this.missCounter++;

                if (this.missCounter > 2) {
                    this.addScore(-500 * this.h);

                    if (this.score < 0) {
                        this.lose();
                    }
                }
            }

            this.goneAlready = false;

            this.bgcolor = [ randomInt(0, 70), randomInt(70, 150), randomInt(100, 180) ].shuffled();
            this.h += 0.1;
            this.assets[(this.tickSwitch = !this.tickSwitch) ? "tick" : "tock"].play();
        }

        this.lastpcounter = this.pcounter;
    } if (this.state === "lose") {
        // vfx: lose

        if (this.scoreCounter > 0) {
            this.scoreCounter -= elapsed;
        }
    }

 };

GameState.prototype._preDraw = function(canvas, inter) {
    if (this.state === "") {
        canvas.fill("black");
    } else if (this.state === "pre") {
        canvas.fill("black");
        canvas.drawImage(this.assets.pendulum, canvas.cx(this.assets.pendulum.width), this.pendy);
        canvas.drawImage(this.assets.clock, canvas.cx(this.assets.clock.width), this.clocky);

        canvas.drawLine(this.canvas.cx(0), 199,
            this.canvas.cx(0) + Math.cos(this.h * Math.PI) * 48,
            199 + Math.sin(this.h * Math.PI) * 48,
            "red", 2);
    } else if (this.state === "running") {
        canvas.fill("rgba(" + this.bgcolor.join(",") + ",1)");
        canvas.setOpacity(0.4);
        var oh = canvas.height() * (this.score / this.scoreCap);
        canvas.fillRect(0, canvas.height() - oh, canvas.width(), oh, "white");
        canvas.setOpacity(1);

        var angle = this.pcounter / 500 * (1 / 6 * Math.PI);
        var r = this.assets.pendulum.height / 2;
        var dy = -r * (1 - Math.sin(0.5 * Math.PI - angle));
        var dx = -r * Math.cos(0.5 * Math.PI - angle);
        canvas.drawRotatedImage(this.assets.pendulum, angle, canvas.cx(this.assets.pendulum.width) + dx, this.pendy + dy);
        canvas.drawImage(this.assets.clock, canvas.cx(this.assets.clock.width), this.clocky);
    
        canvas.drawLine(canvas.cx(), 199,
            canvas.cx() + Math.cos(this.h * Math.PI) * 48,
            199 + Math.sin(this.h * Math.PI) * 48,
            "red", 2);
   
        textManager.drawTextCentered(canvas.cx(), 207, this.counter, "ass");

        if (this.r === 6) {
            textManager.drawText(8, canvas.height() - textManager.fonts.ass.height - 16, "dogs", "ass");
        }

        if (this.scoreCounter > 0) {
            canvas.setOpacity(this.scoreCounter / this.scoreCounterMax * 2);
            textManager.drawTextCentered(
                canvas.cx() + canvas.cx() / 2, 
                canvas.cy() + this.scoreCounter / this.scoreCounterMax * 100, 
                "{color=" + (this.deltaScore >= 0 ? "#AADDFF}+" : "#FF3333}") + Math.floor(this.deltaScore),
                "assMini");
            canvas.setOpacity(1);
        }

    } else if (this.state === "lose") {
        canvas.fill("black");
        canvas.drawImage(this.assets.pendulum, canvas.cx(this.assets.pendulum.width), this.pendy);
        canvas.drawImage(this.assets.clock, canvas.cx(this.assets.clock.width), this.clocky);

        canvas.drawLine(this.canvas.cx(0), 199,
            this.canvas.cx(0) + Math.cos(this.h * Math.PI) * 48,
            199 + Math.sin(this.h * Math.PI) * 48,
            "red", 2);

        textManager.drawTextCentered(canvas.cx(), 207, this.counter, "ass");

        if (this.scoreCounter > 0) {
            canvas.setOpacity(this.scoreCounter / this.scoreCounterMax * 2);
            textManager.drawTextCentered(
                canvas.cx() + canvas.cx() / 2, 
                canvas.cy() + this.scoreCounter / this.scoreCounterMax * 100, 
                "{color=" + (this.deltaScore >= 0 ? "#AADDFF}+" : "#FF3333}") + Math.floor(this.deltaScore),
                "assMini");
            canvas.setOpacity(1);
        }

        textManager.drawText(16, canvas.height() - textManager.fonts.ass.height * 2, "hi-score: ", "ass");
        textManager.drawText(16, canvas.height() - textManager.fonts.ass.height * 1, this.hs, "ass");
    }

    textManager.drawText(16, 8, "{color=" + (game.musicMuted ? "#777777" : "white") + "}♪", "assMini");
    textManager.drawText(56, 8, "{color=" + (game.soundMuted ? "#777777" : "white") + "}`", "assMini");
};

GameState.prototype.addScore = function(s) {
    this.score += s;
    if (this.score > this.scoreCap) this.score = this.scoreCap;
    this.deltaScore = s;
    this.scoreCounter = 500;
    // vfx: something
};

GameState.prototype.lose = function() {
    this.state = "lose";
    this.assets.softtheme.stop();

    var highscore = this.hs = Storage.get("highscore");

    if (this.counter > highscore) {
        Storage.set("highscore", this.counter);
        this.hs = this.counter;
    }
};