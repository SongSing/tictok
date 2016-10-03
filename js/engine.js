// requires: canvas.js

// credits: me, stack overflow, some articles i read on game loops, not rina

var Key =
{
    _pressed: {},

    left: 37,
    up: 38,
    right: 39,
    down: 40,
    space: 32,
    esc: 27,
    enter: 13,

    a: 65,
    b: 66,
    c: 67,
    d: 68,
    e: 69,
    f: 70,
    g: 71,
    h: 72,
    i: 73,
    j: 74,
    k: 75,
    l: 76,
    m: 77,
    n: 78,
    o: 79,
    p: 80,
    q: 81,
    r: 82,
    s: 83,
    t: 84,
    u: 85,
    v: 86,
    w: 87,
    x: 88,
    y: 89,
    z: 90,
    leftclick: -1,
    middleclick: -2,
    rightclick: -3,
    backclick: -4,
    forwardclick: -5,

    alphabet: "abcdefghijklmnopqrstuvwxyz",
    listeners: [],

    char: function(c)
    {
        var ind = this.alphabet.indexOf(c.toLowerCase());

        if (ind !== -1)
        {
            return 65 + ind;
        }

        return -1;
    },
    isDown: function(keyCode)
    {
        return this._pressed.hasOwnProperty(keyCode);
    },
    onKeyDown: function onKeyDown(key) {
        if (!this._pressed[key]) {
            for (var i = 0; i < this.listeners.length; i++) {
                if (this.listeners[i].keys.contains(key)) {
                    this.listeners[i].callback(key);

                    if (this.listeners[i].oneshot) {
                        this.listeners.remove(i--);
                    }
                }
            }
        }

        this._pressed[key] = true;
    },
    onKeyUp: function onKeyUp(key) {
        delete this._pressed[key];
    },

    listenFor: function(c, callback, oneshot) {
        if (typeof(c) !== "object") c = [c];
        this.listeners.push({ keys: c, callback: callback, oneshot: oneshot || false });
    }
};


var __emptyfn = function() {};

window.addEventListener("keydown", function(e)
{
    Key.onKeyDown(e.keyCode);
}, false);

window.addEventListener("keyup", function(e)
{
    Key.onKeyUp(e.keyCode);
}, false);

function WARN(warning)
{
    console.log("WARN: " + warning);
}

// game //

function Game(c, fps, w, h, settings)
{
    this.canvas = new Canvas(c, Canvas.flags.halign | Canvas.flags.valign);
    this.width = w;
    this.height = h;
    this.canvas.resize(w, h);
    this.states = [];
    this.activeStates = [];
    this.lastUpdate = getCurrentTime();
    this.fps = fps;
    this.step = 1000 / fps;
    this.frame = undefined;
    this.runningFps = fps;
    this.fpsCounter = 0;
    this.fpsTime = 0;
    this.started = false;
    this.elapsed = 0;
    this.__assetQueue = [];
    this.__assetCount = 0;
    this.__assetsLoaded = 0;

    this.keys =
    {
        primary:    [ Key.z, Key.leftclick ],
        secondary:  [ Key.x ],
        up:         [ Key.w, Key.up ],
        down:       [ Key.s, Key.down ],
        left:       [ Key.a, Key.left ],
        right:      [ Key.d, Key.right ],
        start:      [ Key.enter ],
        quit:       [ Key.esc ]
    };

    this.listeners = [];
    this.listenPressed = {};
    this.lastPressedStates = {};
    this.mouseStates = [ false, false, false, false, false ];
    this.mousePosition = { x: -1, y: -1 };

    if (settings.hasOwnProperty("imageSmoothing")) {
        this.setImageSmoothingEnabled(settings.imageSmoothing);
    }

    if (settings.hasOwnProperty("keys")) {
        var k = settings.keys;

        for (var keyType in k) {
            this.keys[keyType] = k[keyType];
        }
    }
}

Game.prototype.enableImageSmoothing = function() {
    var ctx = this.canvas.context();
    ctx.mozImageSmoothingEnabled = true;
    ctx.webkitImageSmoothingEnabled = true;
    ctx.msImageSmoothingEnabled = true;
    ctx.imageSmoothingEnabled = true;
};

Game.prototype.disableImageSmoothing = function() {
    var ctx = this.canvas.context();
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
};

Game.prototype.setImageSmoothingEnabled = function(enabled) {
    var ctx = this.canvas.context();
    ctx.mozImageSmoothingEnabled = enabled;
    ctx.webkitImageSmoothingEnabled = enabled;
    ctx.msImageSmoothingEnabled = enabled;
    ctx.imageSmoothingEnabled = enabled;
};

Game.prototype.keyDown = function(keyType)
{
    for (var i = 0; i < this.keys[keyType].length; i++)
    {
        var key = this.keys[keyType][i];

        if (key >= 0 && Key.isDown(key)) {
            return true;
        }

        if (key < 0 && this.mouseStates[-key - 1] === true) {
            return true;
        }
    }

    return false;
};

Game.prototype.keyPressed = function(keyType) {
    if (this.listenPressed.hasOwnProperty(keyType)) {
        return this.listenPressed[keyType];
    } else {
        WARN("not listening for keyType: " + keyType);
        return undefined;
    }
};

Game.prototype.listenFor = function(keyType) {
    if (!this.listeners.contains(keyType)) {
        this.listeners.push(keyType);

        if (this.keys[keyType].some(function(x) { return x < 0; })) {
            this.canvas.setMouseDown((function(thisarg) {
                return function(x, y, e) {
                    if (e.changedTouches) {
                        thisarg.mouseStates[0] = true;
                    } else {
                        thisarg.mouseStates[e.button] = true;
                    }
                };
            })(this));

            this.canvas.setMouseUp((function(thisarg) {
                return function(x, y, e) {
                    if (e.changedTouches) {
                        thisarg.mouseStates[0] = false;
                    } else {
                        thisarg.mouseStates[e.button] = false;
                    }
                };
            })(this));
        }
    } else {
        WARN("already listening for keyType: " + keyType);
    }
};

Game.prototype.trackMouse = function() {
    var self = this;
    var fn = function(x, y) { self.mousePosition = {x:x,y:y}; };

    this.canvas.setMouseMove(fn);
    this.canvas.setMouseUp(fn);
    this.canvas.setMouseDown(fn);
};

Game.prototype.stopListeningFor = function(keyType) {
    if (this.listeners.contains(keyType)) {
        this.listeners.remove(keyType);
    } else {
        WARN("not listening for keyType: " + keyType);
    }
};

Game.prototype.prepareAsset = function(src, fn, callback)
{
    // src needs to be src obv
    // fn is a loading function that takes a src arg and a callback arg -- "callback" IS that callback arg
    // callback should be a fn that takes an asset arg, basically what do u want to do with this asset once it's loaded
    this.__assetQueue.push({ src: src, fn: fn, callback: callback });

    /*

    example:

    prepareAsset("img/thing.png", loadImage, function(img)
    {
        entityOrWhatever.sprite = img;
    });

    custom fn arg:

    prepareAsset("bla/jio.num", function(src, callback)
    {
        // load your shit here with src, and call callback with your loaded thing as the param when youre done
    }, function(num)
    {
        // THIS FUNCTION IS CALLED FROM THE PREV ONE, IT'S "CALLBACK"
    });

    sorry i got confused even tho i made it lol & felt it needed more extensive documentation

    */
};

Game.prototype.prepareAssetDirect = function(src, fn, thisarg, name) {
    this.__assetQueue.push({ src: src, fn: fn, callback: function(asset) {
        thisarg.assets[name] = asset;
    }});
};

Game.prototype.loadAssets = function(callback, progress)
{
    // callback should be a function to execute once all of the assets are loaded (eg starting the level)
    // progress should be a function that takes a % done param (0-1), for loading bars n shit

    this.__assetCount = this.__assetQueue.length;
    this.__assetsLoaded = 0;

    var self = this;

    for (var i = 0; i < this.__assetCount; i++)
    {
        let a = this.__assetQueue[i];

        let cb = function(asset)
        {
            a.callback(asset);
            self.__assetsLoaded++;

            if (progress) progress(self.__assetsLoaded / self.__assetCount);

            if (self.__assetsLoaded === self.__assetCount)
            {
                self.__assetQueue = [];
                self.__assetCount = 0;
                self.__assetsLoaded = 0;
                callback.call(self);
            }
        };

        let err = function(e) {
            WARN("Failed to load asset: " + a.src);
            WARN(e);
        };

        a.fn(a.src, cb, err);
    }
};

Game.prototype.start = function()
{
    if (this.started)
    {
        WARN("game already started");
        return;
    }

    var self = this;

    this.frame = requestAnimationFrame(function(time)
    {
        self.draw(self.canvas, 0);
        self.started = true;
        self.lastUpdate = time;

        self.frame = requestAnimationFrame(function(time)
        {
            self.loop.call(self, time);
        });
    });
};

Game.prototype.stop = function()
{
    tihs.started = false;
    cancelAnimationFrame(this.frame);
};

Game.prototype.resize = function(w, h)
{
    this.width = w;
    this.height = h;
    this.canvas.resize(w, h);
};

Game.prototype.update = function(elapsed)
{
    for (var i = 0; i < this.activeStates.length; i++)
    {
        this.activeStates[i].update(elapsed);
    }
};

Game.prototype.draw = function(inter)
{
    inter = inter || 0;
    var len = this.activeStates.length;

    for (var i = 0; i < len; i++)
    {
        this.activeStates[i].draw(inter);
    }
};

// ****************** ** ********* ** ****************** //
// ****************** ** GAME LOOP ** ****************** //
// ****************** ** ********* ** ****************** //
Game.prototype.loop = function(time)
{
    var self = this;

    this.elapsed += time - this.lastUpdate;

    if (this.fps === -1) // makes it so a -1 fps will make it just go as it goes. prob not good but its an option now lol
    {
        this.step = this.elapsed;
    }

    // update in fixed increments to prevent bull shnt //
    while (this.elapsed >= this.step)
    {

        // update listen keys //
        for (var i = 0; i < this.listeners.length; i++) {
            var keyType = this.listeners[i];
            var keys = this.keys[keyType];
            var keyDown = this.keyDown(keyType);
            var justPressed = (this.lastPressedStates[keyType] === false) && keyDown;

            this.lastPressedStates[keyType] = keyDown;
            this.listenPressed[keyType] = justPressed;
        }

        this.update(this.step);
        this.elapsed -= this.step;
    }

    // draw with leftovers for interpolation //
    this.draw(this.elapsed / this.step);

    this.fpsCounter++;
    this.fpsTime += this.elapsed;

    // update fps //
    while (this.fpsTime >= 1000)
    {
        this.runningFps = 0.25 * this.fpsCounter + 0.75 * this.runningFps;
        this.fpsTime -= 1000;
        this.fpsCounter = 0;
    }

    this.lastUpdate = time;

    this.frame = requestAnimationFrame(function(time)
    {
        self.loop.call(self, time);
    });
};

Game.prototype.addState = function(state, makeActive)
{
    state.__game = this;
    state.canvas = this.canvas;
    this.states.push(state);

    if (makeActive)
    {
        this.makeStateActive(state);
    }
};

Game.prototype.removeState = function(state)
{
    if (this.states.contains(state))
    {
        this.makeStateInactive(state);
        this.states.remove(this.states.indexOf(state));
    }
    else
    {
        WARN("tried to remove non-added state");
    }
};

Game.prototype.makeStateActive = function(state)
{
    if (!this.states.contains(state))
    {
        this.addState(state);
        WARN("made non-added state active");
    }

    this.activeStates.push(state);
};

Game.prototype.makeStateInactive = function(state)
{
    if (!this.states.contains(state))
    {
        this.addState(state);
        WARN("made non-added state inactive");
        return;
    }

    if (!this.activeStates.contains(state))
    {
        WARN("made inactive state inactive");
        return;
    }

    this.activeStates.remove(this.activeStates.indexOf(state));
};

Game.prototype.makeStateOnlyActive = function(state)
{
    if (!this.states.contains(state))
    {
        this.addState(state);
        WARN("made non-added state only active");
    }

    this.activeStates = [ state ];
};

Game.prototype.stateIsActive = function(state)
{
    return this.activeStates.contains(state);
};

Game.prototype.hasInBounds = function(e)
{
    return !(e.right() <= 0 || e.x >= this.width || e.bottom() <= 0 || e.y >= this.height);
};

// state //

function State()
{
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
}

State.prototype.hookPreUpdate = function(fn)
{
    this.preUpdates.push(fn);
};

State.prototype.unhookPreUpdate = function(fn)
{
    if (this.preUpdating)
    {
        this.__preUpdateRemoveQueue.push(fn);
    }
    else
    {
        this.preUpdates.remove(fn);
    }
};

State.prototype.unhookAllPreUpdates = function() {
    if (this.preUpdating) {
        this.__preUpdateRemoveQueue = [].concat(this.preUpdates);
    } else {
        this.preUpdates = [];
    }
};

State.prototype.hookPostUpdate = function(fn)
{
    this.postUpdates.push(fn);
};

State.prototype.unhookPostUpdate = function(fn)
{
    if (this.postUpdating)
    {
        this.__postUpdateRemoveQueue.push(fn);
    }
    else
    {
        this.postUpdates.remove(fn);
    }
};

State.prototype.hookPreDraw = function(fn)
{
    this.preDraws.push(fn);
};

State.prototype.unhookPreDraw = function(fn)
{
    this.preDraws.remove(fn);
};

State.prototype.unhookAllPreDraws = function() {
    this.preDraws = [];
};

State.prototype.hookPostDraw = function(fn)
{
    this.postDraws.push(fn);
};

State.prototype.unhookPostDraw = function(fn)
{
    this.postDraws.remove(fn);
};

State.prototype.preDraw = function(inter)
{
    var canvas = this.canvas || self.__game.canvas;
    var len = this.preDraws.length;

    for (var i = 0; i < len; i++)
    {
        this.preDraws[i].call(this, canvas, inter);
    }
};

State.prototype.postDraw = function(inter)
{
    var canvas = this.canvas || self.__game.canvas;
    var len = this.postDraws.length;

    for (var i = 0; i < len; i++)
    {
        this.postDraws[i](canvas, inter);
    }
};

State.prototype.preUpdate = function(elapsed)
{
    var len = this.preUpdates.length;

    this.preUpdating = true;

    for (var i = 0; i < len; i++)
    {
        var fn = this.preUpdates[i];

        var r = fn.call(this, elapsed);

        if (r === false)
        {
            this.unhookPreUpdate(fn);
        }
    };

    this.preUpdating = false;

    len = this.__preUpdateRemoveQueue.length;

    for (var i = 0; i < len; i++)
    {
        this.unhookPreUpdate(this.__preUpdateRemoveQueue.shift());
    };
};

State.prototype.postUpdate = function(elapsed)
{
    var len = this.postUpdates.length;

    this.postUpdating = true;

    for (var i = 0; i < len; i++)
    {
        var fn = this.postUpdates[i];

        if (fn(elapsed) === false)
        {
            unhookPostUpdate(fn);
        }
    };

    this.postUpdating = false;

    len = this.__postUpdateRemoveQueue.length;

    for (var i = 0; i < len; i++)
    {
        this.unhookPostUpdate(this.__postUpdateRemoveQueue[i]);
    };
};

State.prototype.addEntity = function(entity)
{
    entity.__state = this;

    if (this.entities.length === 0)
    {
        this.entities.push(entity);
        return;
    }

    if (entity.zIndex > this.entities.lastItem().zIndex)
    {
        this.entities.push(entity);
        return;
    }

    var len = this.entities.length;

    for (var i = 0; i < len; i++)
    {
        if (entity.zIndex <= this.entities[i].zIndex)
        {
            this.entities.insert(entity, i);
            break;
        }
    }
};

State.prototype.removeEntity = function(entity)
{
    if (this.entities.contains(entity))
    {
        if (this.isUpdating)
        {
            this.removeQueue.push(entity);
        }
        else
        {
            this.entities.remove(entity);
        }
    }
    else
    {
        WARN("tried to remove non-added entity");
    }
};

State.prototype.clearEntities = function()
{
    this.entities = [];
};

State.prototype.pause = function()
{
    this.paused = true;
};

State.prototype.unpause = function()
{
    this.paused = false;
};

State.prototype.setPaused = function(paused)
{
    this.paused = paused;
};

State.prototype.update = function(elapsed)
{
    if (!this.paused)
    {
        this.preUpdate(elapsed);
        var len = this.entities.length;

        this.isUpdating = true;

        for (var i = 0; i < len; i++)
        {
            var entity = this.entities[i];
            if (entity.update(elapsed) === false)
            {
                this.removeQueue.push(i);
            }
        }

        this.isUpdating = false;

        len = this.removeQueue.length;

        for (var i = 0; i < len; i++)
        {
            this.entities.splice(this.removeQueue[i], 1);
        }

        this.removeQueue = [];

        this.postUpdate(elapsed);
    }
};

State.prototype.draw = function(inter)
{
    var canvas = this.canvas || this.__game.canvas;
    inter = inter || 0;

    var len = this.entities.length;

    this.preDraw(canvas);

    for (var i = 0; i < len; i++)
    {
        this.entities[i].draw(canvas, inter);
    }

    this.postDraw(canvas);
};

// entity //

function Entity(x, y, w, h, z)
{
    z = z || 0;

    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.zIndex = z;
    this.sprite = undefined;
    /*this.spriteWidth = undefined; // these are used for spritesheets
    this.spriteHeight = undefined;
    this.spriteRow = 0;
    this.spriteColumn = 0;*/
    this.updateHooks = [];
    this.drawHooks = [];
}

Entity.prototype.hookUpdate = function(fn)
{
    this.updateHooks.push(fn);
};

Entity.prototype.unhookUpdate = function(fn)
{
    this.updateHooks.remove(fn);
};

Entity.prototype.hookDraw = function(fn)
{
    this.drawHooks.push(fn);
};

Entity.prototype.unhookDraw = function(fn)
{
    this.drawHooks.remove(fn);
};

/*Entity.prototype.setSprite = function(src, width, height, callback, autodraw)
{
    var self = this;
    var img;

    if (typeof(src) === "string")
    {
        loadImage(src, function(_img)
        {
            img = _img;
        });
    }
    else
    {
        img = src;
    }

    this.sprite = img;
    this.spriteWidth = width || img.width;
    this.spriteHeight = height || img.height;
    this.spriteRow = 0;
    this.spriteColumn = 0;

    if (autodraw)
    {
        self.draw = function(canvas)
        {
            canvas.drawCroppedImage
            (
                self.sprite,
                Math.round(self.x),
                Math.round(self.y),
                self.spriteColumn * self.spriteWidth,
                self.spriteRow * self.spriteHeight,
                self.spriteWidth,
                self.spriteHeight,
                self.width,
                self.height
            );
        };
    }

    if (callback) callback.call(this);
};*/

Entity.prototype.update = function(elapsed)
{
    var len = this.updateHooks.length;

    for (var i = 0; i < len; i++)
    {
        this.updateHooks[i](elapsed);
    }
};

Entity.prototype.draw = function(canvas, inter)
{
    var len = this.drawHooks.length;

    for (var i = 0; i < len; i++)
    {
        this.drawHooks[i](canvas, inter);
    }
};

Entity.prototype.top = function()
{
    return this.y;
};

Entity.prototype.left = function()
{
    return this.x;
};

Entity.prototype.bottom = function()
{
    return this.y + this.height;
};

Entity.prototype.right = function()
{
    return this.x + this.width;
};

Entity.prototype.isCollidingWith = function(entity)
{
    return !(entity.x >= this.right() || entity.right() <= this.x || entity.y >= this.bottom() || entity.bottom() <= this.y);
};

Entity.prototype.willCollideWith = function(entity, _x, _y, _ox, _oy)
{
    return !(entity.x + _ox >= this.right() + _x || entity.right() + _ox <= this.x + _x || entity.y + _oy >= this.bottom() + _y || entity.bottom() + _oy <= this.y + _y);
};

Entity.prototype.isOnScreen = function()
{
    return !(0 >= this.right() || this._state._game.width <= this.x || 0 >= this.bottom() || this._state._game.height <= this.y);
};

/*Entity.prototype.setSpriteRow = function(row)
{
    this.spriteRow = row;
};

Entity.prototype.setSpriteColomn = function(column)
{
    this.spriteColumn = column;
};*/

// utils //

function loadImage(src, callback, onerror)
{
    var img = new Image();

    img.onload = function()
    {
        callback(this);
    };

    img.onerror = function(e) {
        onerror(e);
    };

    img.src = src;
}

function getCurrentTime()
{
    return Date.now();
}

function randomInt(min, max)
{
    return parseInt(Math.random() * (max - min) + min);
}

function clamp(val, min, max)
{
    return val > max ? max : val < min ? min : val;
}

function sign(n)
{
    if (n >= 0)
    {
        return 1;
    }

    return -1;
}

function pointIsInRect(px, py, x, y, w, h)
{
    if (h === undefined) // gave a point instead of x and y values
    {
        h = w;
        w = y;
        y = x;
        x = py;
        py = px.y;
        px = px.x;
    }

    return !(px <= x || px >= x + w || py <= y || py >= y + h);
}

function pointInRect() {
    return pointIsInRect.apply(this, arguments);
}

Number.prototype.roundToZero = function()
{
    return this <= 0 ? Math.floor(this) : Math.ceil(this);
};

Array.prototype.contains = function(item)
{
    return this.indexOf(item) !== -1;
};

String.prototype.contains = function(str)
{
    return this.indexOf(str) !== -1;
};

Array.prototype.remove = function(item)
{
    this.splice(this.indexOf(item), 1);
    return this;
};

Array.prototype.removeAt = function(index) {
    this.splice(index, 1);
    return this;
};

Array.prototype.insert = function(item, index)
{
    this.splice(index, 0, item);
    return item;
};

Array.prototype.lastItem = function()
{
    return this[this.length - 1];
};

Array.prototype.randomItem = function()
{
    return this[randomInt(0, this.length)];
};

Array.prototype.shuffled = function() {
    var ret = [];
    var t = [].concat(this);

    while (t.length > 0) {
        var i = randomInt(0, t.length);

        ret.push(t[i]);
        t.splice(i, 1);
    }

    return ret;
};

function vectorFromAngle(angle, magnitude)
{
    magnitude = magnitude | 1;
    return { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
}

Function.prototype.extends = function(c)
{
    // songsing, why don't we just set them equal to eachother?
    // because, dumbass, then mutating the child prototype would also mutate the parent's
    // not only can u mutate the prototype itself, but you can mutate the functions. i think.
    for (var key in c.prototype)
    {
        this.prototype[key] = c.prototype[key];
    }
};