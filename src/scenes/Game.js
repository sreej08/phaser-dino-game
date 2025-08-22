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
        this.isGameRunning = true;
        this.gameSpeed = 5;  // CHANGE VARIABLE TO CHANGE DIFFICULY
        this.timer = 0;

        // add dino sprite
        this.player = this.physics.add.sprite(200, 200, "dino")
            .setDepth(1)
            .setOrigin(0, 1)
            .setGravityY(1000)
            .setCollideWorldBounds(true)
            .setBodySize(44, 92);
        // add clouds
        this.clouds = this.add.group();
        this.clouds = this.clouds.addMultiple([this.add.image(200, 100, "cloud"),
                                               this.add.image(300, 130, "cloud"),
                                               this.add.image(450, 90, "cloud"),]);
        // add ground
        this.ground = this.add
            .tileSprite(0, 300, 1000, 30, "ground")
            .setOrigin(0, 1);  
        

        this.groundCollider = this.physics.add.staticSprite(0, 300, "ground").setOrigin(0, 1);
        this.groundCollider.visible = false;
        this.groundCollider.body.setSize(1000, 30);

        this.cursors = this.input.keyboard.createCursorKeys();
        // enable collision between player and wall
        this.physics.add.collider(this.player, this.groundCollider);
        this.obstacles = this.physics.add.group({
            allowGravity: false // No gravity for cactuses
        });

        this.physics.add.collider(this.obstacles, this.player, this.gameOver, null, this);

        this.gameOverText = this.add.image(0, 0, "game-over");
        this.restartText = this.add.image(0, 80, "restart").setInteractive();

        this.gameOverContainer = this.add
            .container(1000/2, (300/2) - 50)
            .add([this.gameOverText, this.restartText])
            .setAlpha(0);

        this.scoreText = this.add.text(750, 30, "00000", {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5
        }).setOrigin(1,0);

        this.score = 0;
        this.frameCounter = 0;

        this.highScore = 0;
        this.highScoreText = this.add.text(700, 0, "High: 00000", {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5
        }).setOrigin(1,0).setAlpha(1);
        
        this.congratsText = this.add.text(0, 0, "Congratulations! A new high score!", {
            fontSize: 30,
            fontFamily: "Arial",
            color: "#535353",
            resolution: 5
        }).setOrigin(0).setAlpha(0); // initially hide this message
    }

    update(time, delta) {
        if (!this.isGameRunning) {return;}
        this.ground.tilePositionX += this.gameSpeed;
        // create cactus obstacle using timer
        this.timer += delta;
        console.log(this.timer);
        if (this.timer > 1000) {
            this.obstacleNum = Math.floor(Math.random() * 6) + 1;
            this.obstacles.create(750, 220, `obstacle-${this.obstacleNum}`).setOrigin(0);
            this.timer -= 1000;
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
        this.restartText.on("pointerdown", () => {
            this.physics.resume();
            this.player.setVelocityY(0);
            this.obstacles.clear(true, true);
            this.gameOverContainer.setAlpha(0);
            this.congratsText.setAlpha(0);
            this.frameCounter = 0;
            this.score = 0;
            const formattedScore = String(Math.floor(this.score)).padStart(5, "0");
            this.scoreText.setText(formattedScore);
            this.anims.resumeAll();
            this.isGameRunning = true;
        })

        this.frameCounter++;
        if (this.frameCounter > 100) {
            this.score += 100;
            const formattedScore = String(Math.floor(this.score)).padStart(5, "0");
            this.scoreText.setText(formattedScore);
            this.frameCounter -= 100;
        }

        this.anims.create({
            key: "dino-run",
            frames: this.anims.generateFrameNames("dino", {start: 2, end: 3}),
            frameRate: 10,
            repeat: -1
        });
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
        }

        this.physics.pause();
        this.timer = 0;
        this.isGameRunning = false;
        this.anims.pauseAll();
        this.player.setTexture("dino-hurt");
        this.sound.play("hit");
        this.gameOverContainer.setAlpha(1);
    }   

}