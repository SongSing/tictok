// requires: canvas.js

// how 2 add a font
/*

game.prepareAsset("glyphs/ass", function(src, cb)
{
    var f = new TextManager.Font(src, 12, "white", 1, 1, "black", 1, cb);
}, function(font)
{
    textManager.fonts.whatever = font;
});

*/

function TextManager(canvas)
{
    // canvas is a Canvas object (not dom element)
    this.fonts = {};
    this.canvas = canvas;
    this.color = undefined;
}

TextManager.prototype.drawText = function(x, y, text, font)
{
    text = text.toString();
    if (typeof(font) === "string") {
        font = this.fonts[font];
    }

    var _x = x;
    this.color = font.color;

    for (var i = 0; i < text.length; i++)
    {
        if (text[i] === "{")
        {
            var ind = text.substr(i).indexOf("}");
            var cmd = text.substr(i, ind);
            var color = cmd.split("=")[1];
            font.color = color;
            i += ind;
            continue;
        }

        this.drawGlyph(_x, y, text[i], font);
        _x += font.glyphWidth(text[i]) + font.kerningWidth();
    }

    font.color = this.color;
    return _x;
};

TextManager.prototype.drawTextCentered = function(cx, cy, text, font) {
    text = text.toString();
    if (typeof(font) === "string") {
        font = this.fonts[font];
    }

    var w = font.stringWidth(text);
    this.drawText(cx - w / 2, cy - font.height / 2, text, font);
};

TextManager.prototype.drawGlyph = function(x, y, glyph, font, __shadow)
{
    if (__shadow === undefined) __shadow = true;

    if ((font.shadowX || font.shadowY) && __shadow)
    {
        this.drawGlyph(x + font.shadowX * font.unitSize(), y + font.shadowY * font.unitSize(), glyph, font, false);
    }

    glyph = glyph[0];
    var d = font.glyphs[glyph];
    var bs = font.unitSize();
    var oc = font.height % font.glyphs["0"].length !== 0;

    for (var _y = 0; _y < d.length; _y++)
    {
        for (var _x = 0; _x < d[_y].length; _x++)
        {
            if (d[_y][_x])
            {
                this.canvas.fillRect(Math.floor(x + _x * bs), Math.floor(y + _y * bs), Math.floor(bs)+oc, Math.floor(bs)+oc, (__shadow ? font.color : font.shadowColor));
            }
        }
    }
};

TextManager.Font = function(glyphs, height, color, shadowX, shadowY, shadowColor, kerning, callback)
{
    this.glyphs = glyphs;
    this.height = height;
    this.color = color;
    this.shadowX = shadowX;
    this.shadowY = shadowY;
    this.shadowColor = shadowColor;
    this.kerning = kerning;

    if (typeof(glyphs) === "string")
    {
        this.loadFromFolder(glyphs, callback);
    }
}

TextManager.Font.prototype.glyphWidth = function(glyph, scaleWithHeight)
{
    if (scaleWithHeight === undefined) scaleWithHeight = true;

   return this.glyphs[glyph][0].length * (+scaleWithHeight * (this.height / this.glyphs[glyph].length));
};

TextManager.Font.prototype.stringWidth = function(str)
{
    var ret = 0;

    for (var i = 0; i < str.length; i++) {
        if (str[i] === "{") {
            var ind = str.substr(i).indexOf("}");
            i += ind;
            continue;
        }

        ret += this.glyphWidth(str[i]) + this.kerningWidth();
    }

    return ret;
};

TextManager.Font.prototype.kerningWidth = function()
{
    return this.kerning * (this.height / this.glyphs["0"].length);
};

TextManager.Font.prototype.unitSize = function()
{
    return this.height / this.glyphs["0"].length;
};

TextManager.Font.prototype.loadFromFolder = function(path, callback)
{
    this.glyphs = {};
    // callback should be a function that takes this font object once it's ready
    var lookingFor = 
    {
        "la":"a",
        "lb":"b",
        "lc":"c",
        "ld":"d",
        "le":"e",
        "lf":"f",
        "lg":"g",
        "lh":"h",
        "li":"i",
        "lj":"j",
        "lk":"k",
        "ll":"l",
        "lm":"m",
        "ln":"n",
        "lo":"o",
        "lp":"p",
        "lq":"q",
        "lr":"r",
        "ls":"s",
        "lt":"t",
        "lu":"u",
        "lv":"v",
        "lw":"w",
        "lx":"x",
        "ly":"y",
        "lz":"z",
        "ua":"A",
        "ub":"B",
        "uc":"C",
        "ud":"D",
        "ue":"E",
        "uf":"F",
        "ug":"G",
        "uh":"H",
        "ui":"I",
        "uj":"J",
        "uk":"K",
        "ul":"L",
        "um":"M",
        "un":"N",
        "uo":"O",
        "up":"P",
        "uq":"Q",
        "ur":"R",
        "us":"S",
        "ut":"T",
        "uu":"U",
        "uv":"V",
        "uw":"W",
        "ux":"X",
        "uy":"Y",
        "uz":"Z",
        "0":"0",
        "0":"0",
        "1":"1",
        "2":"2",
        "3":"3",
        "4":"4",
        "5":"5",
        "6":"6",
        "7":"7",
        "8":"8",
        "9":"9",
        ")":")",
        "dot":".",
        "question":"?",
        "exclaim":"!",
        "rightquote":"”",
        "leftquote":"“",
        "quote":"\"",
        "rightsinglequote":"‘",
        "leftsinglequote":" ’",
        "'":"'",
        "space":" ",
        ",":",",
        "+":"+",
        "-":"-",
        "colon":":",
        "musicnote":"♪",
        "speaker":"`"
    };

    var self = this;
    self.__loading = 0;
    self.__loaded = 0;

    for (var key in lookingFor)
    {
        self.__loading++;
    }

    for (var key in lookingFor)
    {
        self.glyphs[lookingFor[key]] = [];

        (function(self, key)
        {;
            loadImage(path + "/" + key + ".png", function(img)
            {
                var c = new Canvas(document.createElement("canvas"));
                c.resize(img.width, img.height);
                c.drawImage(img, 0, 0);

                var pixels = c.getImageData32();

                for (var y = 0; y < img.height; y++)
                {
                    self.glyphs[lookingFor[key]].push([]);

                    for (var x = 0; x < img.width; x++)
                    {
                        self.glyphs[lookingFor[key]][y].push((pixels[y * img.width + x] & 16777215) === 0);
                    }
                }

                self.__loaded++;

                if (self.__loaded === self.__loading)
                {
                    callback(self);
                }
            });
        })(self, key);
    }
};