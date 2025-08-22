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
    }

    preload() {
        this.load.image("cloud", "assets/cloud.png")
        this.load.image("ground", "assets/ground.png")
        this.load.spritesheet("dino", "assets/dino-run.png", {frameWidth: 88, frameHeight: 94});
        for(let i=0; i < 6; i++) {
            const cactNum = i + 1;
            this.load.image(`obstacle-${cactNum}`, `assets/cactuses_${cactNum}.png`);
            
        }
    }

    create() {
        // add dino sprite
        this.player = this.physics.add.sprite(200, 200, "dino")
            .setOrigin(0, 1)
            .setGravityY(5000)
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
        this.gameSpeed = 5;  // CHANGE VARIABLE TO CHANGE DIFFICULY

        this.groundCollider = this.physics.add.staticSprite(0, 300, "ground").setOrigin(0, 1);
        this.groundCollider.body.setSize(1000, 30);
        // enable collision between player and wall
        this.physics.add.collider(this.player, this.groundCollider);
        this.obstacles = this.physics.add.group({
            allowGravity: false // No gravity for cactuses
        });
        this.timer = 0;
    }

    update(time, delta) {
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
    }

}