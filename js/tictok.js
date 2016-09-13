window.onload = function() {
    var f = function()
    {
        var wait = Date.parse("10/01/2016") - Date.now();

        var days = Math.floor(wait / (24 * 60 * 60 * 1000));
        var hours = Math.floor(wait / (1000 * 60 * 60) % 24);
        var minutes = Math.floor(wait / (1000 * 60) % 60);
        var seconds = Math.floor(wait / 1000 % 60);

        document.getElementById("countdown").innerHTML = 
              days + " day" + (days === 1 ? "" : "s") + ", " 
            + hours + " hour" + (hours === 1 ? "" : "s") + ", " 
            + minutes + " minute" + (minutes === 1 ? "" : "s") + ", and " 
            + seconds + " second" + (seconds === 1 ? "" : "s");
    };

    f();

    setInterval(f, 400);
};