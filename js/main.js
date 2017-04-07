
function l(what) {return document.getElementById(what);}

var App = {
    Inputs: {},
    Resources: {},
    UpdateFrame: function(delta) {
        App.GuiLogic(delta);
        Game.Logic(delta);
        Game.RootEntity.update(delta);
    },
    globalScale: 1,
    elapsedMsec: 0,
    GuiLogic: function(delta) {
        this.elapsedMsec += delta;
    },
    DrawFrame: function(interpolationPercentage) {
        var ctx = App.Context;
        ctx.clearRect(0, 0, App.Canvas.width, App.Canvas.height);
        ctx.save();
        ctx.scale(App.globalScale, App.globalScale);
        Game.Map.drawMap(ctx, 0, 0);
        Game.RootEntity.draw(ctx);
        ctx.restore();

        ctx = App.ContextHud;
        ctx.clearRect(0, 0, App.CanvasHud.width, App.CanvasHud.height);
        App.DrawTankGui(ctx, Game.Teams[0], 0, 0);
        App.DrawTankGui(ctx, Game.Teams[1], 256, 0);
        App.DrawTankGui(ctx, Game.Teams[2], 512, 0);
        App.DrawJoinTicker(ctx, 896, 32);
    },
    DrawTankGui: function(ctx, team, x, y) {
        ctx.save();
        ctx.translate(x, y);
        var tank = team.Tank;
        if(tank && !tank.hidden) {
            var scale = 30 / tank.width;
            ctx.drawImage(App.Canvas, tank.x - tank.width, tank.y - tank.width,  tank.width*2, tank.width*2, 2, 1, 60, 60);
        } else {
            var phase = Math.floor( this.elapsedMsec / 50 % 4 );
            //l("debugText").innerHTML = "phase: " + phase;
            ctx.drawImage(App.Resources.noise, phase * 30, 0, 30, 30, 2, 1, 60, 60);
        }

        ctx.translate(64, 0);
        App.DrawInputs(ctx, team);

        ctx.translate(64, 0);
        App.DrawScore(ctx, team);

        ctx.translate(62, 0);
        App.DrawHealthCube(ctx, team);

        ctx.restore();
    },
    GuiPositions: null, // see EntryPoint
    DrawInputs: function(ctx, team) {

        for(var i = 0; i < this.GuiPositions.length; i++) {
            var guiSpec = this.GuiPositions[i];
            if (!(guiSpec.name in team.Inputs))
                continue;
            
            var input = team.Inputs[guiSpec.name];
            var valueProp = "value";
            var vacantProp = "vacant";
            if (guiSpec.p) {
                valueProp += guiSpec.p;
                vacantProp += guiSpec.p;
            }
            var vacant = input[vacantProp];
            var value = input[valueProp];
            
            ctx.save();

            ctx.translate(guiSpec.x+10.5, guiSpec.y+10.5);
            if (value == 1) {
                ctx.fillStyle = "#FFFFA0";
                ctx.fillRect(-10.5, -10.5, 21, 21);
            } else if (value < 0) {
                ctx.fillStyle = "#808080";
                ctx.fillRect(-10.5, 10.5 + 21 * value, 21, -21 * value);                
            }
            ctx.globalAlpha = (vacant || value < 0) ? 0.4 : 1;
            if(guiSpec.rot)
                ctx.rotate(guiSpec.rot);
            if(guiSpec.flipx)
                ctx.scale(-1, 1);
            ctx.drawImage(guiSpec.icon, -10.5, -10.5, 21, 21);

            ctx.restore();
        }
    },
    DrawScore: function(ctx, team) {
        ctx.save();
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        var tank = team.Tank;
        if(tank && !tank.hidden && team.teamId >= 0)
            ctx.fillStyle = Res.TeamStyles[team.teamId];
        else
            ctx.fillStyle = "gray";
        ctx.globalAlpha = 0.6;
        ctx.font = "14px 'Russo One'";
        ctx.fillText(Res.Score, 31, 48);
        ctx.globalAlpha = 1;
        ctx.font = "18px 'Press Start 2P'";
        ctx.translate(31, 30);
        ctx.fillText(team.kills, 0, 0);
        if (team.popKillsTime > 0) {
            var phase = team.popKillsTime / 500;
            if (phase > 1)
                team.popKillsTime = -1;
            else {
                ctx.globalAlpha = 1 - phase * phase;
                var scalePhase = 1 + Math.sin(phase * Math.PI/2) * 2;
                ctx.scale(scalePhase, scalePhase);
                ctx.fillText(team.kills, 0, 0);
            }
        }
        ctx.restore();
    },
    DrawHealthCube: function(ctx, team) {
        if(team.Tank)
            ctx.drawImage(App.Resources.hpLeaf, 8, 0, 16, 16);
        var hp = 9;
        var tankHp = team.Tank ? team.Tank.hp : 0;
        for(var y = 16; y < 64; y += 16)
            for(var x = 0; x < 48; x += 16) {
                var lit = tankHp >= hp;
                ctx.drawImage(lit ? App.Resources.hpCubeLit : App.Resources.hpCubeDim, x, y, 16, 16);
                hp--;
            }
    },
    DrawJoinTicker: function(ctx, x, y) {
        ctx.font = "bold 14px Roboto";
        ctx.fillStyle = "#F00";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        if(!urlToJoinGame)
            urlToJoinGame = location.host;
        ctx.save();
        ctx.translate(x, y);
        // 5 degrees max tilt, Pi seconds period
        ctx.rotate(5 / 180 * Math.PI * Math.sin(this.elapsedMsec/1000));
        // song is 128 bpm = 2,1333 bps, 1000 / Pi / 2,1333 = 149
        var scale = 1.1 + 0.1 * Math.sin(this.elapsedMsec/149);
        ctx.scale(scale, scale);
        ctx.fillText(urlToJoinGame, 0, 0);
        ctx.restore();
    },
    EndFrame: function(fps, panic) {
            if (panic) {
                var discardedTime = Math.round(MainLoop.resetFrameDelta());
                console.warn('Main loop panicked, probably because the browser tab was put in the background. Discarding ' + discardedTime + 'ms');
            }
    },
    EntryPoint: function() {

        App.Keyboard = new Keyboard();
        App.Canvas = document.getElementById('gameCanvas');
        App.Context = App.Canvas.getContext('2d');
        App.Context.mozImageSmoothingEnabled = false;
        App.Context.webkitImageSmoothingEnabled = false;
        App.Context.msImageSmoothingEnabled = false;
        App.Context.imageSmoothingEnabled = false;
        App.CanvasHud = document.getElementById('topCanvas');
        App.ContextHud = App.CanvasHud.getContext('2d');

        App.Resources.hpCubeLit = new Image();
        App.Resources.hpCubeLit.src = "./images/hp-cube.png";
        App.Resources.hpCubeDim = new Image();
        App.Resources.hpCubeDim.src = "./images/hp-cube-off.png";
        App.Resources.hpLeaf = new Image();
        App.Resources.hpLeaf.src = "./images/hp-leaf.png";
        App.Resources.arrowTop = new Image();
        App.Resources.arrowTop.src = "./images/arrow-top.png";
        App.Resources.arrowLeft = new Image();
        App.Resources.arrowLeft.src = "./images/arrow-rot-left.png";
        App.Resources.arrowShot = new Image();
        App.Resources.arrowShot.src = "./images/arrow-shot.png";
        App.Resources.arrowChevron = new Image();
        App.Resources.arrowChevron.src = "./images/arrow-flag.png";
        App.Resources.noise = new Image();
        App.Resources.noise.src = "./images/noise.png";

        this.GuiPositions = [
            {name: "TankTurnInput", p:"Backward",   x: 0, y:42, icon: App.Resources.arrowTop, rot:-Math.PI/2},
            {name: "TankTurnInput", p:"Forward",    x:42, y:42, icon: App.Resources.arrowTop, rot:Math.PI/2},
            {name: "ThrottleInput", p:"Forward",    x:21, y:21, icon: App.Resources.arrowTop},
            {name: "ThrottleInput", p:"Backward",   x:21, y:42, icon: App.Resources.arrowTop, rot:Math.PI},
            {name: "TurretTurnInput", p:"Backward", x: 0, y: 0, icon: App.Resources.arrowLeft},
            {name: "TurretTurnInput", p:"Forward",  x:42, y: 0, icon: App.Resources.arrowLeft, flipx:true},
            {name: "FireInput",                     x:21, y: 0, icon: App.Resources.arrowShot},
            {name: "ManagerGood",                   x: 0, y:21, icon: App.Resources.arrowChevron},
            {name: "ManagerBad",                    x:42, y:21, icon: App.Resources.arrowChevron, rot:Math.PI},
            {name: "ManagerBoss",                   x:42, y:21, icon: App.Resources.arrowChevron},
        ];

        var sounds = [
            "./sound/crash.wav",
            "./sound/longblast.mp3",
            "./sound/blast1.mp3",
            "./sound/blast2.mp3",
            "./sound/tank-fire.wav",
            "./sound/shot2.mp3",
            "./sound/shot3.mp3"
        ];
        var target = sounds.length + 1;
        var onloaded = function() {
            App.soundsLoaded++;
            if(App.soundsLoaded == target)
                App.FinishEntry();
        }
        for(var i in sounds)
            Sound.Load(sounds[i], onloaded);
        Sound.Load("./sound/engine working long.mp3", onloaded, "1");
    },
    soundsLoaded: 0,
    FinishEntry: function() {

        Game.Setup();

        // Background music: Plug it In
        //                by AlumoMusic - http://www.alumomusic.com
        // 
        // Licensed for use within this project and its derivatives - please don't extract and reuse separately.
        // Listen for free at http://www.jamendo.com
        Game.Music = Sound.Play("./sound/background.mp3", 60, true);
        App.SetVolumeText(60);

        document.onkeypress = function(e) {
            if(e.key == '-') {
                var vol = volumeToInteger(Game.Music.volume);
                if(vol > 0) {
                    vol -= 10;
                    vol = Math.max(vol, 0);
                    Game.Music.volume = volumeToFraction(vol);
                    if(vol == 0 && !Game.Music.paused) {
                        Game.Music.pause();
                        Game.Music.currentTime = 0;
                    }
                    App.SetVolumeText(vol);
                }
            }
            else if(e.key == '=') {
                var vol = volumeToInteger(Game.Music.volume);
                if(vol < 100) {
                    vol += 10;
                    vol = Math.min(vol, 100);
                    Game.Music.volume = volumeToFraction(vol);
                    if(vol > 0 && Game.Music.paused) {
                        Game.Music.play();
                    }
                    App.SetVolumeText(vol);
                }
            }
        }

        // no address here, it is drawn in DrawJoinTicker
        document.getElementById("hud4message").innerHTML = Res.inviteLine1 + "<br/><br/>" + Res.inviteLine3;

        MainLoop.setBegin(Game.ConsumeInputs).setUpdate(App.UpdateFrame).setDraw(App.DrawFrame).setEnd(App.EndFrame).start();
    },
    SetVolumeText: function(intVolume) {
        var str = intVolume == 0 
            ? Res.volumeOff
            : intVolume < 100 
                ? "&nbsp;" + intVolume.toString() + "%" 
                : intVolume.toString() + "%";
        document.getElementById("musicVolume").innerHTML = str;
    }
};

var documentReadyInterval = setInterval(function() {
    if (document.readyState === 'complete') {
        App.EntryPoint();
        clearInterval(documentReadyInterval);
        window.onresize = function() {
            if (App.Canvas != undefined) {
                // App.Canvas.width = window.innerWidth;
                // App.Canvas.height = window.innerHeight;
            }
        };
    }
}, 50);
