function TitleState() {
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

    this.quote = 0;
    this.quoteAmt = 4;
    this.quoting = false;

    this.counter = 0;
    this.state = "";
    this.startSwitch = false;
} TitleState.extends(State);

TitleState.prototype.prepareAssets = function() {
    this.assets = {};

    this.__game.prepareAssetDirect("img/songsingindustry.png", loadImage, this, "splash");
    this.__game.prepareAssetDirect("img/logo.png", loadImage, this, "title");
    this.__game.prepareAssetDirect("img/logoblack.png", loadImage, this, "titleblack");
    this.__game.prepareAssetDirect("img/titletick.png", loadImage, this, "tick");
    this.__game.prepareAssetDirect("img/titletock.png", loadImage, this, "tock");
    this.__game.prepareAssetDirect("img/pressstart.png", loadImage, this, "start");

    for (var i = 0; i < this.quoteAmt; i++) {
        this.__game.prepareAssetDirect("img/quote" + i + ".png", loadImage, this, "quote" + i);
    }

    this.__game.prepareAssetDirect("audio/bleep.wav", Song.load, this, "bleep");
    this.__game.prepareAssetDirect("audio/ffft.wav", Song.load, this, "ffft");
    this.__game.prepareAssetDirect("audio/theme.wav", Song.load, this, "theme");
};

TitleState.prototype.start = function() {
    this.__game.listenFor("primary");
    this.__game.listenFor("start");
    this.__game.trackMouse();

    this.animSequence = new Sequence(this);

    this.animSequence.append(__emptyfn, 0, 1, 1000, function() { this.state = "splash"; this.assets.bleep.play(); });
    this.animSequence.append(__emptyfn, 0, 1, 2000, function() { this.state = ""; });
    this.animSequence.append(__emptyfn, 0, 1, 1000, function() { this.state = "quotefadein"; this.quoting = true; });

    for (var i = 0; i < this.quoteAmt; i++) {
        this.animSequence.append(this.setCounterToX, 0, 1, 2000, function() { this.state = "quote"; });
        this.animSequence.append(__emptyfn, 0, 1, 500, function() { this.state = "quotefadeout"; });
        this.animSequence.append(this.setCounterToOneMinusX, 0, 1, 2000, function() { this.state = ""; });
        this.animSequence.append(__emptyfn, 0, 1, 500, function() {
            this.quote++;

            if (this.quote === this.quoteAmt) {
                this.quoting = false;
            }

            this.state = this.quote === this.quoteAmt ? "" : "quotefadein";
        });
    }

    this.animSequence.append(__emptyfn, 0, 1, 500, function() { this.state = "tick"; gameState.assets.tick.play(); });
    this.animSequence.append(this.setCounterToX, 0, 1, 1000, function() { this.state = "tock"; gameState.assets.tock.play(); });
    this.animSequence.append(this.setCounterToX, 0, 1, 1000, function() { this.state = "fadewhite"; });
    this.animSequence.append(this.setCounterToX, 0, 1, 1000, function() { this.state = "introtitle"; this.assets.ffft.fadeIn(this, 2000, 1); });
    this.animSequence.append(this.setCounterToX, 0, 2, 2000, function() { this.state = "title"; this.assets.theme.setLoops(true); this.assets.theme.play(); });

    this.hookPreUpdate(this._preUpdate);
    this.hookPreDraw(this._preDraw);

    this.animSequence.run();
};

TitleState.prototype._preUpdate = function(elapsed) {
    if (this.__game.keyPressed("primary") && this.__game.canvas.mouseIsDown) {
        var p = this.__game.mousePosition;

        if (pointInRect(p, 49, 4, 54, 46)) {
            this.__game.soundMuted = !this.__game.soundMuted;
            this.assets.bleep.setMuted(this.__game.soundMuted);
            gameState.assets.tick.setMuted(this.__game.soundMuted);
            gameState.assets.tock.setMuted(this.__game.soundMuted);
            Storage.set("soundMuted", this.__game.soundMuted);
            return true;
        } else if (pointInRect(p, 7, 4, 37, 46)) {
            this.__game.musicMuted = !this.__game.musicMuted;
            this.assets.theme.setMuted(this.__game.musicMuted);
            this.assets.ffft.setMuted(this.__game.musicMuted);
            gameState.assets.softtheme.setMuted(this.__game.musicMuted);
            Storage.set("musicMuted", this.__game.musicMuted);
            return true;
        }
    }

    if (this.state === "title") {
        if (this.__game.keyPressed("primary") || this.__game.keyPressed("start")) {
            this.state = "fadeblack";
            this.assets.theme.fadeOut(this, 1000);
            this.counter = 0;

            var s = new Sequence(this);
            s.append(this.setCounterToX, 0, 1, 1000, startGame); // startGame defined in tictok.js
            s.run();
            return;
        }

        this.counter += elapsed;

        if (this.counter >= 500) {
            this.counter %= 500;
            this.startSwitch = !this.startSwitch;
        }
    } else if (this.quoting) {
        if (this.__game.keyPressed("primary") || this.__game.keyPressed("start")) {
            while (this.quoting) {
                this.animSequence.skipCurrent(true);
            }
        }
    }
};

// gl reading this ha //
TitleState.prototype._preDraw = function(canvas, inter) {
    if (this.state === "") {
        canvas.fill("black");
    } else if (this.state === "splash") {
        canvas.drawImage(this.assets.splash, 0, 0);
    } else if (this.state === "quotefadein") {
        this.drawQuote(canvas, this.quote, this.counter);
    } else if (this.state === "quote") {
        this.drawQuote(canvas, this.quote, 1);
    } else if (this.state === "quotefadeout") {
        this.drawQuote(canvas, this.quote, this.counter);
    } else if (this.state === "tick") {
        canvas.fill("black");
        canvas.setOpacity(0.9 - Math.min(0.9, this.counter));
        canvas.drawRotatedImage(this.assets.tick, 
            Math.PI * this.counter * 0.15, 
            200 + Math.sqrt(this.counter) * 100,
            100 + Math.sin(Math.PI * this.counter * 0.4) * 40,
            this.assets.tick.width * 2.5 * (0.8 + this.counter), this.assets.tick.height * 2.5 * (0.8 + this.counter));
        canvas.setOpacity(1);
    } else if (this.state === "tock") {
        canvas.fill("black");
        canvas.setOpacity(0.9 - Math.min(0.9, this.counter));
        canvas.drawRotatedImage(this.assets.tock, 
            -Math.PI * this.counter * 0.15, 
            canvas.width() - 200 - Math.sqrt(this.counter) * 100,
            300 - Math.sin(Math.PI * this.counter * 0.4) * 40,
            this.assets.tock.width * 2.5 * (0.8 + this.counter), this.assets.tock.height * 2.5 * (0.8 + this.counter));
        canvas.setOpacity(1);
    } else if (this.state === "fadewhite") {
        canvas.fill("black");
        canvas.setOpacity(this.counter);
        canvas.fill("white");
        canvas.setOpacity(1);
    } else if (this.state === "introtitle") {
        if (this.counter >= 1.8) {
            canvas.fill("rgba(63, 72, 204, 1)");
            canvas.drawImage(this.assets.title, canvas.cx(this.assets.title.width), 100);
        } else if (this.counter > 0.4) {
            canvas.fill("white");

            var w = this.assets.titleblack.width * (this.counter - 0.4);
            var h = this.assets.titleblack.height * (this.counter - 0.4);

            canvas.drawImage(
                this.assets.titleblack, 
                canvas.cx(w) + randomInt(0, w / 6) - w / 12, 
                100 + this.assets.titleblack.height / 2 - h / 2 + randomInt(0, h / 6) - h / 12,
                 w, h);
        }
    } else if (this.state === "title") {
        canvas.fill("rgba(63, 72, 204, 1)");
        canvas.drawImage(this.assets.title, canvas.cx(this.assets.title.width), 100);
        if (this.startSwitch) canvas.drawImage(this.assets.start, canvas.cx(this.assets.start.width), canvas.height() - 100);
    } else if (this.state === "fadeblack") {
        canvas.fill("rgba(63, 72, 204, 1)");
        canvas.drawImage(this.assets.title, canvas.cx(this.assets.title.width), 100);
        canvas.setOpacity(this.counter / 1);
        canvas.fill("black");
        canvas.setOpacity(1);
    }

    textManager.drawText(16, 8, "{color=" + (game.musicMuted ? "#777777" : "white") + "}♪", "assMini");
    textManager.drawText(56, 8, "{color=" + (game.soundMuted ? "#777777" : "white") + "}`", "assMini");
};

TitleState.prototype.setCounterToX = function(x) {
    this.counter = x;
};

TitleState.prototype.setCounterToOneMinusX = function(x) {
    this.counter = 1 - x;
};

TitleState.prototype.nextQuote = function() {
    this.quote++;
};

TitleState.prototype.drawQuote = function(canvas, quote, opacity) {
    canvas.fill("black");
    canvas.setOpacity(opacity);
    canvas.drawImage(this.assets["quote" + quote], 0, 0);
    canvas.setOpacity(1);
};