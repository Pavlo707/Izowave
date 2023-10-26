import { LEVEL_MAP_PERSPECTIVE } from '~const/world/level';
import { getIsometricDistance } from '~lib/dimension';
import { IWorld } from '~type/world';
import { EntityType } from '~type/world/entities';
import { EnemyVariantData, EnemyTexture, IEnemy } from '~type/world/entities/npc/enemy';

import { Enemy } from '../enemy';

const REGENERATION_RADIUS = 100;

export class EnemyTelepath extends Enemy {
  static SpawnWaveRange = [13];

  private regenerateArea: Phaser.GameObjects.Ellipse;

  private regenerateTimer: Nullable<Phaser.Time.TimerEvent> = null;

  constructor(scene: IWorld, data: EnemyVariantData) {
    super(scene, {
      ...data,
      texture: EnemyTexture.TELEPATH,
      multipliers: {
        health: 1.5,
        damage: 1.0,
        speed: 0.8,
      },
    });

    this.addArea();

    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      this.removeArea();
      if (this.regenerateTimer) {
        this.scene.removeProgression(this.regenerateTimer);
      }
    });
  }

  public update() {
    super.update();

    if (this.regenerateArea.visible) {
      const position = this.getBottomFace();

      this.regenerateArea.setPosition(position.x, position.y);
    }
  }

  public onDamage(amount: number) {
    this.healNearbyEnemies(amount);
    super.onDamage(amount);
  }

  private healNearbyEnemies(amount: number) {
    const position = this.getBottomFace();
    const enemies: IEnemy[] = [];

    this.scene.getEntities<IEnemy>(EntityType.ENEMY).forEach((enemy) => {
      if (
        !(enemy instanceof EnemyTelepath)
        && !enemy.live.isMaxHealth()
      ) {
        const distance = getIsometricDistance(position, enemy.getBottomFace());

        if (distance <= REGENERATION_RADIUS) {
          enemies.push(enemy);
        }
      }
    });

    if (enemies.length > 0) {
      if (this.regenerateTimer) {
        this.scene.removeProgression(this.regenerateTimer);
      } else {
        this.regenerateArea.setVisible(true);
      }

      this.regenerateTimer = this.scene.addProgression({
        duration: 500,
        onComplete: () => {
          this.regenerateTimer = null;
          this.regenerateArea.setVisible(false);
        },
      });

      enemies.forEach((enemy) => {
        const healthAmount = Math.floor(amount / enemies.length);

        enemy.live.addHealth(healthAmount);
      });
    }
  }

  private addArea() {
    const d = REGENERATION_RADIUS * 2;

    this.regenerateArea = this.scene.add.ellipse(0, 0, d, d * LEVEL_MAP_PERSPECTIVE);
    this.regenerateArea.setVisible(false);
    this.regenerateArea.setFillStyle(0x6fe7e7, 0.33);
  }

  private removeArea() {
    this.regenerateArea.destroy();
  }
}