import { Scene } from 'phaser';

const WIDTH = 1024;
const HEIGHT = 768;

export class Game extends Scene {
    constructor() {
        super('Game');
        this.player = null;
        this.ground = null;
        this.clouds = null;
        this.gameSpeed = null;
        this.groundCollider = null;
        this.obstacles = null;
        this.obstacleNum = null;
        this.gameOverText = null;
        this.restartText = null;
        this.isGameRunning = null;
        this.scoreText = null;
        this.score = null;
        this.frameCounter = null;

        // background color cycling
        this.bgColors = null;
        this.bgColorIndex = null;
        this.lastBgChangeScore = null;

        // UI containers
        this.mainMenuContainer = null;
        this.settingsContainer = null;
        this.pauseContainer = null;

        // settings
        this.settings = {
            speed: 5,
            gravity: 1000,
            obstacleInterval: 1000 // ms
        };

        this.obstacleInterval = 1000;
    }

    preload() {
        this.load.image("cloud", "assets/cloud.png")
        this.load.image("ground", "assets/ground.png")
        this.load.spritesheet("dino", "assets/dino-run.png", {frameWidth: 88, frameHeight: 94});
        for(let i=0; i < 6; i++) {
            const cactNum = i + 1;
            this.load.image(`obstacle-${cactNum}`, `assets/cactuses_${cactNum}.png`);
        this.load.image("game-over", "assets/game-over.png");
        this.load.image("restart", "assets/restart.png");
        this.load.image("dino-hurt", "assets/dino-hurt.png");
        this.load.audio("jump", "assets/jump.m4a");
        this.load.audio("hit", "assets/hit.m4a");
        }
    }

    create() {
        // Start with menus visible and game paused
        this.isGameRunning = false;
        this.gameSpeed = this.settings.speed;
        this.timer = 0;
        this.obstacleInterval = this.settings.obstacleInterval;
        
        // GAME OVER UI: center on defined WIDTH/HEIGHT and start hidden + non-interactive
        this.gameOverText = this.add.image(0, 0, "game-over").setOrigin(0.5);
        this.restartText = this.add.image(0, 80, "restart").setOrigin(0.5).setInteractive();
        // disable click until shown by gameOver()
        this.restartText.disableInteractive();
        this.restartText.on("pointerdown", () => {
            this.startGame();
        });
        this.gameOverContainer = this.add
            .container(WIDTH / 2, HEIGHT / 2, [this.gameOverText, this.restartText])
            .setAlpha(0)
            .setVisible(false);

        // background colors to cycle through every 1000 points
        this.bgColors = ['#AEE7FF', '#FFDFAE', '#C9FFE0', '#FFE0F5', '#EAEAEA'];
        this.bgColorIndex = 0;
        this.lastBgChangeScore = 0;
        this.cameras.main.setBackgroundColor(this.bgColors[this.bgColorIndex]);

        // add dino sprite (hidden until Play)
        this.player = this.physics.add.sprite(200, 200, "dino")
            .setDepth(1)
            .setOrigin(0, 1)
            .setGravityY(this.settings.gravity)
            .setCollideWorldBounds(true)
            .setBodySize(44, 92);
        this.player.setVisible(false);
        this.player.body.enable = false;

        // add clouds (hidden)
        this.clouds = this.add.group();
        this.clouds = this.clouds.addMultiple([this.add.image(200, 100, "cloud"),
                                               this.add.image(300, 130, "cloud"),
                                               this.add.image(450, 90, "cloud"),]);
        this.clouds.getChildren().forEach(c => c.setVisible(false));

        // add ground (hidden)
        this.ground = this.add
            .tileSprite(0, 300, 1000, 30, "ground")
            .setOrigin(0, 1)
            .setVisible(false);

        this.groundCollider = this.physics.add.staticSprite(0, 300, "ground").setOrigin(0, 1);
        this.groundCollider.visible = false;
        this.groundCollider.body.setSize(1000, 30);
        this.groundCollider.body.enable = false;

        this.cursors = this.input.keyboard.createCursorKeys();
        // enable collision (collider exists but will be inactive until play)
        this.physics.add.collider(this.player, this.groundCollider);
        this.obstacles = this.physics.add.group({
            allowGravity: false // No gravity for cactuses
        });

        this.physics.add.collider(this.obstacles, this.player, this.gameOver, null, this);

        // game over UI (hidden)
        this.gameOverText = this.add.image(0, 0, "game-over");
        this.restartText = this.add.image(0, 80, "restart").setOrigin(0.5).setInteractive();

        this.gameOverContainer = this.add
            .container(WIDTH / 2, HEIGHT / 2, [this.gameOverText, this.restartText])
            .setAlpha(0)
            .setVisible(false);

        this.scoreText = this.add.text(750, 30, "00000", {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5
        }).setOrigin(1,0);
        this.scoreText.setVisible(false);

        this.score = 0;
        this.frameCounter = 0;

        this.highScore = 0;
        this.highScoreText = this.add.text(700, 0, "High: 00000", {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5
        }).setOrigin(1,0).setAlpha(1);
        this.highScoreText.setVisible(false);
        
        this.congratsText = this.add.text(0, 0, "Congratulations! A new high score!", {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5
        }).setOrigin(0).setAlpha(0); // initially hide this message
        this.congratsText.setVisible(false);

        // Create menus
        this.createMainMenu();
        this.createSettingsMenu();
        this.createPauseMenu();
       
        // keep a backup holder for settings when opening settings menu
        this._settingsBackup = { ...this.settings };

        // keyboard Esc handling
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.mainMenuContainer.visible || this.settingsContainer.visible) {
                // ignore while in menu
                return;
            }
            if (this.pauseContainer.visible) {
                // resume on ESC if paused
                this.resumeGame();
            } else if (this.isGameRunning) {
                this.pauseGame();
            }
        });

        // restart button behavior (in game over)
        this.restartText.on("pointerdown", () => {
            this.startGame();
        });

        // create run animation (once)
        this.anims.create({
            key: "dino-run",
            frames: this.anims.generateFrameNames("dino", {start: 2, end: 3}),
            frameRate: 10,
            repeat: -1
        });

        // show main menu initially
        this.showMainMenu();
    }

    createMainMenu() {
        // Title and buttons positioned relative to the defined WIDTH/HEIGHT (container centered)
        const title = this.add.text(0, -HEIGHT * 0.20, 'DINO GAME', {
            fontSize: 64,
            fontFamily: "Arial",
            color: "#222",
            stroke: "#fff",
            strokeThickness: 6
        }).setOrigin(1);

        const play = this.add.text(-122, 0, 'PLAY', {
            fontSize: 40, fontFamily: "Arial", color: "#000", backgroundColor: "#fff", padding: { x: 20, y: 10}
        }).setOrigin(1).setInteractive();

        const settings = this.add.text(-297, 10, 'SETTINGS', {
            fontSize: 36, fontFamily: "Arial", color: "#000", backgroundColor: "#fff", padding: { x: 18, y: 10}
        }).setOrigin(0).setInteractive();

        play.on('pointerdown', () => this.startGame());
        settings.on('pointerdown', () => this.showSettings());

        // Container is centered at the defined WIDTH/HEIGHT (not the browser)
        this.mainMenuContainer = this.add.container(WIDTH / 2, HEIGHT / 2, [title, play, settings]);
        this.mainMenuContainer.setDepth(1000);
    }

    createSettingsMenu() {
        const yStart = HEIGHT/4;
        const labelStyle = { fontSize: 28, fontFamily: "Arial", color: "#222" };
        const valueStyle = { fontSize: 26, fontFamily: "Arial", color: "#fff", backgroundColor: "#222", padding: {x:8,y:6} };

        const title = this.add.text(0, -HEIGHT * 0.2, 'SETTINGS', { fontSize: 48, fontFamily: "Arial", color: "#222" }).setOrigin(1);

        // Speed
        const speedLabel = this.add.text(-250, -HEIGHT * 0.06 + 20, 'SPEED', labelStyle).setOrigin(1);
        const speedVal = this.add.text(-150, -HEIGHT * 0.06 + 20, String(this.settings.speed), valueStyle).setOrigin(1);
        const speedDec = this.add.text(-50, -HEIGHT * 0.06 + 20, '-', { fontSize: 32, backgroundColor: "#eee" }).setInteractive().setOrigin(1);
        const speedInc = this.add.text(0, -HEIGHT * 0.06 + 20, '+', { fontSize: 32, backgroundColor: "#eee" }).setInteractive().setOrigin(1);

        speedInc.on('pointerdown', () => {
            this.settings.speed = Math.min(20, this.settings.speed + 1);
            speedVal.setText(String(this.settings.speed));
        });
        speedDec.on('pointerdown', () => {
            this.settings.speed = Math.max(1, this.settings.speed - 1);
            speedVal.setText(String(this.settings.speed));
        });

        // Gravity
        const gravLabel = this.add.text(-250, -HEIGHT * 0.06 + 80, 'GRAVITY', labelStyle).setOrigin(1);
        const gravVal = this.add.text(-120, -HEIGHT * 0.06 + 80, String(this.settings.gravity), valueStyle).setOrigin(1);
        const gravDec = this.add.text(-50, -HEIGHT * 0.06 + 80, '-', { fontSize: 32, backgroundColor: "#eee" }).setInteractive().setOrigin(1);
        const gravInc = this.add.text(0, -HEIGHT * 0.06 + 80, '+', { fontSize: 32, backgroundColor: "#eee" }).setInteractive().setOrigin(1);

        gravInc.on('pointerdown', () => {
            this.settings.gravity = Math.min(3000, this.settings.gravity + 50);
            gravVal.setText(String(this.settings.gravity));
        });
        gravDec.on('pointerdown', () => {
            this.settings.gravity = Math.max(200, this.settings.gravity - 50);
            gravVal.setText(String(this.settings.gravity));
        });

        // Obstacle frequency (interval ms)
        const freqLabel = this.add.text(-250, -HEIGHT * 0.06 + 140, 'OBSTACLE (ms)', labelStyle).setOrigin(1);
        const freqVal = this.add.text(-120, -HEIGHT * 0.06 + 140, String(this.settings.obstacleInterval), valueStyle).setOrigin(1);
        const freqDec = this.add.text(-50, -HEIGHT * 0.06 + 140, '-', { fontSize: 32, backgroundColor: "#eee" }).setInteractive().setOrigin(1);
        const freqInc = this.add.text(0, -HEIGHT * 0.06 + 140, '+', { fontSize: 32, backgroundColor: "#eee" }).setInteractive().setOrigin(1);

        freqInc.on('pointerdown', () => {
            this.settings.obstacleInterval = Math.max(200, this.settings.obstacleInterval - 100); // faster => smaller interval
            freqVal.setText(String(this.settings.obstacleInterval));
        });
        freqDec.on('pointerdown', () => {
            this.settings.obstacleInterval = Math.min(5000, this.settings.obstacleInterval + 100); // slower => larger interval
            freqVal.setText(String(this.settings.obstacleInterval));
        });

        // OK and CANCEL buttons (OK applies current edits, CANCEL reverts to previous)
        const ok = this.add.text(-200, HEIGHT * 0.25, 'OK', { fontSize: 32, fontFamily: "Arial", color: "#000", backgroundColor: "#fff", padding: { x: 18, y: 8} }).setOrigin(1).setInteractive();
        const cancel = this.add.text(0, HEIGHT * 0.25, 'CANCEL', { fontSize: 28, fontFamily: "Arial", color: "#000", backgroundColor: "#fff", padding: { x: 14, y: 8} }).setOrigin(1).setInteractive();

        ok.on('pointerdown', () => {
            // just go back to main menu - settings already written to this.settings
            this.showMainMenu();
        });
        cancel.on('pointerdown', () => {
            // revert to backup and update UI values
            this.settings = { ...this._settingsBackup };
            speedVal.setText(String(this.settings.speed));
            gravVal.setText(String(this.settings.gravity));
            freqVal.setText(String(this.settings.obstacleInterval));
            this.showMainMenu();
        });

        this.settingsUI = { speedVal, gravVal, freqVal };
        this.settingsContainer = this.add.container(WIDTH / 2, HEIGHT / 2, [title, speedLabel, speedVal, speedDec, speedInc, gravLabel, gravVal, gravDec, gravInc, freqLabel, freqVal, freqDec, freqInc, ok, cancel]);
        this.settingsContainer.setVisible(false);
    }

    createPauseMenu() {
        // center pause menu relative to defined WIDTH/HEIGHT
        const bg = this.add.rectangle(0, 0, 600, 300, 0x000000, 0.6).setOrigin(0.5);
        const scoreLabel = this.add.text(0, -60, 'PAUSED', { fontSize: 48, fontFamily: "Arial", color: "#fff" }).setOrigin(0.5);
        const currentScoreText = this.add.text(0, -10, 'Score: 00000', { fontSize: 32, fontFamily: "Arial", color: "#fff" }).setOrigin(0.5);
        const resume = this.add.text(0, 40, 'RESUME', { fontSize: 28, fontFamily: "Arial", color: "#000", backgroundColor: "#fff", padding: {x:16,y:8} }).setOrigin(0.5).setInteractive();
        const back = this.add.text(0, 100, 'BACK TO MENU', { fontSize: 24, fontFamily: "Arial", color: "#000", backgroundColor: "#fff", padding: {x:12,y:6} }).setOrigin(0.5).setInteractive();

        resume.on('pointerdown', () => {
            this.resumeGame();
        });

        back.on('pointerdown', () => {
            // cancel current run and go to main menu
            this.goToMainMenu();
        });

        this.pauseCurrentScoreText = currentScoreText;
        this.pauseContainer = this.add.container(WIDTH / 2, HEIGHT / 2, [bg, scoreLabel, currentScoreText, resume, back]);
        this.pauseContainer.setDepth(1000);
        this.pauseContainer.setVisible(false);
    }

    showMainMenu() {
        // show main menu and hide others
        this.mainMenuContainer.setVisible(true);
        this.settingsContainer.setVisible(false);
        this.pauseContainer.setVisible(false);
        // ensure any game-over UI is hidden and non-interactive
        if (this.gameOverContainer) {
            this.gameOverContainer.setVisible(false).setAlpha(0);
            if (this.restartText && this.restartText.disableInteractive) this.restartText.disableInteractive();
        }
 
        // hide core game objects
        this.player.setVisible(false);
        this.player.body.enable = false;
        this.ground.setVisible(false);
        this.groundCollider.body.enable = false;
        this.clouds.getChildren().forEach(c => c.setVisible(false));
        this.scoreText.setVisible(false);
        this.highScoreText.setVisible(false);
        this.congratsText.setVisible(false);
 
        // clear obstacles
        this.obstacles.clear(true, true);
 
        // ensure physics running state consistent
        this.physics.resume();
        this.isGameRunning = false;
    }

    showSettings() {
        this.mainMenuContainer.setVisible(false);
        this.settingsContainer.setVisible(true);
        this.pauseContainer.setVisible(false);
    }

    startGame() {
        // hide menus
        this.mainMenuContainer.setVisible(false);
        this.settingsContainer.setVisible(false);
        this.pauseContainer.setVisible(false);
 
        // apply settings
        this.gameSpeed = this.settings.speed;
        this.obstacleInterval = this.settings.obstacleInterval;
        this.player.setGravityY(this.settings.gravity);
 
        // show game objects
        this.player.setVisible(true);
        this.player.body.enable = true;
        this.ground.setVisible(true);
        this.groundCollider.body.enable = true;
        this.clouds.getChildren().forEach(c => c.setVisible(true));
        this.scoreText.setVisible(true);
        this.highScoreText.setVisible(true);
        this.congratsText.setVisible(false);
 
        // hide any game over UI (in case startGame called after a crash)
        if (this.gameOverContainer) {
            this.gameOverContainer.setVisible(false).setAlpha(0);
        }
        if (this.restartText && this.restartText.disableInteractive) this.restartText.disableInteractive();
 
        // reset game state
        this.frameCounter = 0;
        this.score = 0;
        this.lastBgChangeScore = 0;
        this.bgColorIndex = 0;
        this.cameras.main.setBackgroundColor(this.bgColors[this.bgColorIndex]);
        const formattedScore = String(Math.floor(this.score)).padStart(5, "0");
        this.scoreText.setText(formattedScore);
 
        this.obstacles.clear(true, true);
        this.timer = 0;
 
        this.anims.resumeAll();
        this.physics.resume();
        this.isGameRunning = true;
    }

    pauseGame() {
        if (!this.isGameRunning) return;
        this.physics.pause();
        this.isGameRunning = false;
        this.pauseCurrentScoreText.setText('Score: ' + String(Math.floor(this.score)).padStart(5, "0"));
        this.pauseContainer.setVisible(true);
    }

    resumeGame() {
        if (this.mainMenuContainer.visible || this.settingsContainer.visible) return;
        this.pauseContainer.setVisible(false);
        this.physics.resume();
        this.isGameRunning = true;
    }

    goToMainMenu() {
        // cancel run
        this.physics.resume(); // ensure physics not paused for cleanup
        this.obstacles.clear(true, true);
        this.isGameRunning = false;
        this.showMainMenu();
    }

    update(time, delta) {
        if (!this.isGameRunning) {return;}
        this.ground.tilePositionX += this.gameSpeed;
        // create cactus obstacle using timer
        this.timer += delta;
        if (this.timer > this.obstacleInterval) {
            this.obstacleNum = Math.floor(Math.random() * 6) + 1;
            this.obstacles.create(750, 220, `obstacle-${this.obstacleNum}`).setOrigin(0);
            this.timer -= this.obstacleInterval;
        }
        Phaser.Actions.IncX(this.obstacles.getChildren(), -this.gameSpeed);
        this.obstacles.getChildren().forEach(obstacle => {
            if (obstacle.getBounds().right < 0) {
                this.obstacles.remove(obstacle);
                obstacle.destroy();
            }
        })
        const { space, up } = this.cursors;
        
        if ((Phaser.Input.Keyboard.JustDown(space) || Phaser.Input.Keyboard.JustDown(up)) && this.player.body.onFloor()) {
            this.player.setVelocityY(-1600);
            this.sound.play("jump");
        }

        this.frameCounter++;
        if (this.frameCounter > 100) {
            this.score += 100;
            const formattedScore = String(Math.floor(this.score)).padStart(5, "0");
            this.scoreText.setText(formattedScore);
            this.frameCounter -= 100;
            // change background color each time score reaches a multiple of 1000
            if (this.score > 0 && this.score % 1000 === 0 && this.lastBgChangeScore !== this.score) {
                this.bgColorIndex = (this.bgColorIndex + 1) % this.bgColors.length;
                this.cameras.main.setBackgroundColor(this.bgColors[this.bgColorIndex]);
                this.lastBgChangeScore = this.score;
            }
        }

        // if jumping, stop running anim
        if (this.player.body.deltaAbsY() > 4) {
            // temporarily stop running anim
            this.player.anims.stop();
            this.player.setTexture("dino", 0);
        } else {
            this.player.play("dino-run", true);
        }

    }

    gameOver() {
        // see if high score
        if (this.score > this.highScore) { 
            this.highScore = this.score; // update high score
            // update text showing high score
            this.highScoreText.setText("High: " + String(this.highScore).padStart(5, "0"));
            this.congratsText.setAlpha(1); // show congrats text
            this.congratsText.setVisible(true);
        }
 
        this.physics.pause();
        this.timer = 0;
        this.isGameRunning = false;
        this.anims.pauseAll();
        this.player.setTexture("dino-hurt");
        this.sound.play("hit");
        if (this.gameOverContainer) {
            this.gameOverContainer.setVisible(true).setAlpha(1);
        }
        if (this.restartText && this.restartText.setInteractive) this.restartText.setInteractive();
        // show game over UI (score etc)
        this.scoreText.setVisible(true);
    }   
    

}