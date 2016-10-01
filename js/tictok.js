var game;
var titleState, gameState;
var textManager;

function init() {
    var gameSettings = {
        imageSmoothing: false,
        keys: {
            primary: [ Key.z, Key.leftclick, Key.space ],
            start: [ Key.enter ]
        }
    };

    game  = new Game(document.getElementById("canvas"), -1, 960, 540, gameSettings);
    textManager = new TextManager(game.canvas);

    var ctx = game.canvas.context();

    

    titleState = new TitleState();
    gameState = new GameState();

    game.addState(titleState, true);
    game.addState(gameState, true);

    game.soundMuted = Storage.get("soundMuted", false);
    game.musicMuted = Storage.get("musicMuted", false);

    // load assets //

    titleState.prepareAssets();
    gameState.prepareAssets();

    game.loadAssets(startTitle, loadProgressed);
}

function startTitle() {
    titleState.assets.bleep.setMuted(game.soundMuted);
    gameState.assets.tick.setMuted(game.soundMuted);
    gameState.assets.tock.setMuted(game.soundMuted);

    titleState.assets.theme.setMuted(game.musicMuted);
    titleState.assets.ffft.setMuted(game.musicMuted);
    gameState.assets.softtheme.setMuted(game.musicMuted);
    
    titleState.start();
    game.start();
}

function startGame() {
    gameState.start();
    game.makeStateOnlyActive(gameState);
}

function loadProgressed(progress) {
    game.canvas.fill("black");
    game.canvas.fillRect(16, game.canvas.height() - 32, game.canvas.width() - 32, 16, "white");
    game.canvas.fillRect(16, game.canvas.height() - 32, (game.canvas.width() - 32) * progress, 16, "#1144FF");
}

window.addEventListener("load", function() {
    init();
});