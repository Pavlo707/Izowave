import EventEmitter from 'events';

import Phaser from 'phaser';

import { CONTROL_KEY } from '~const/controls';
import { DIFFICULTY } from '~const/world/difficulty';
import { ENEMIES } from '~const/world/entities/enemies';
import { WAVE_TIMELEFT_ALARM, WAVE_TIMELEFT_AFTER_SKIP } from '~const/world/wave';
import { registerAudioAssets } from '~lib/assets';
import { eachEntries } from '~lib/system';
import { calcGrowth } from '~lib/utils';
import { TutorialStep } from '~type/tutorial';
import { IWorld } from '~type/world';
import { EnemyVariant } from '~type/world/entities/npc/enemy';
import { IWave, WaveAudio, WaveEvents } from '~type/world/wave';

export class Wave extends EventEmitter implements IWave {
  readonly scene: IWorld;

  private _isGoing: boolean = false;

  public get isGoing() { return this._isGoing; }

  private set isGoing(v) { this._isGoing = v; }

  public isPeaceMode: boolean = false;

  public number: number = 1;

  private spawnedEnemiesCount: number = 0;

  private enemiesMaxCount: number = 0;

  private nextWaveTimestamp: number = 0;

  private nextSpawnTimestamp: number = 0;

  private alarmInterval: Nullable<NodeJS.Timer> = null;

  constructor(scene: IWorld) {
    super();

    this.scene = scene;

    this.runTimeleft();

    this.scene.input.keyboard.on(CONTROL_KEY.WAVE_TIMELEFT_AFTER_SKIP, this.skipTimeleft, this);
  }

  public getTimeleft() {
    const now = this.scene.getTime();

    return Math.max(0, this.nextWaveTimestamp - now);
  }

  public update() {
    const now = this.scene.getTime();

    if (this.isGoing) {
      if (this.spawnedEnemiesCount < this.enemiesMaxCount) {
        if (this.nextSpawnTimestamp <= now) {
          this.spawnEnemy();
        }
      } else if (this.scene.entityGroups.enemies.getTotalUsed() === 0) {
        this.complete();
      }
    } else {
      const left = this.nextWaveTimestamp - now;

      if (left <= 0) {
        this.start();
      } else if (left <= WAVE_TIMELEFT_ALARM && !this.alarmInterval) {
        this.scene.sound.play(WaveAudio.TICK);
        this.alarmInterval = setInterval(() => {
          this.scene.sound.play(WaveAudio.TICK);
        }, 1000);
      }
    }
  }

  public runTimeleft() {
    let pause: number;

    if (this.scene.isTimePaused()) {
      pause = WAVE_TIMELEFT_ALARM;
    } else {
      pause = calcGrowth(
        DIFFICULTY.WAVE_PAUSE,
        DIFFICULTY.WAVE_PAUSE_GROWTH,
        this.number,
      ) / this.scene.game.difficulty;
    }

    this.nextWaveTimestamp = this.scene.getTime() + pause;
  }

  public getEnemiesLeft() {
    const currentEnemies = this.scene.entityGroups.enemies.getTotalUsed();
    const killedEnemies = this.spawnedEnemiesCount - currentEnemies;

    return this.enemiesMaxCount - killedEnemies;
  }

  public skipEnemies() {
    if (!this.isGoing) {
      return;
    }

    this.spawnedEnemiesCount = this.enemiesMaxCount;
  }

  private skipTimeleft() {
    if (this.isGoing || this.scene.isTimePaused()) {
      return;
    }

    const now = this.scene.getTime();

    if (this.nextWaveTimestamp - now <= WAVE_TIMELEFT_AFTER_SKIP) {
      return;
    }

    this.nextWaveTimestamp = now + WAVE_TIMELEFT_AFTER_SKIP;
  }

  private start() {
    if (this.isPeaceMode) {
      return;
    }

    this.isGoing = true;

    this.nextSpawnTimestamp = 0;
    this.spawnedEnemiesCount = 0;
    this.enemiesMaxCount = calcGrowth(
      DIFFICULTY.WAVE_ENEMIES_COUNT,
      DIFFICULTY.WAVE_ENEMIES_COUNT_GROWTH,
      this.number,
    );

    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }

    this.scene.sound.play(WaveAudio.START);

    this.emit(WaveEvents.START, this.number);

    this.scene.game.tutorial.end(TutorialStep.UPGRADE_BUILDING);
    this.scene.game.tutorial.end(TutorialStep.WAVE_TIMELEFT);
  }

  private complete() {
    this.isGoing = false;
    this.number++;
    this.runTimeleft();

    this.scene.sound.play(WaveAudio.COMPLETE);

    this.emit(WaveEvents.COMPLETE, this.number);

    if (this.number === 1) {
      this.scene.game.tutorial.beg(TutorialStep.BUILD_AMMUNITION);
    } else if (this.number === 2) {
      this.scene.game.tutorial.beg(TutorialStep.UPGRADE_BUILDING);
    }

    this.scene.game.analytics.track({
      world: this.scene,
      success: true,
    });
  }

  private spawnEnemy() {
    const variant = this.getEnemyVariant();

    this.scene.spawnEnemy(variant);

    const now = this.scene.getTime();
    const pause = calcGrowth(
      DIFFICULTY.WAVE_ENEMIES_SPAWN_PAUSE,
      DIFFICULTY.WAVE_ENEMIES_SPAWN_PAUSE_GROWTH,
      this.number,
    );

    this.nextSpawnTimestamp = now + Math.max(pause, 500);
    this.spawnedEnemiesCount++;
  }

  private getEnemyVariant() {
    if (
      this.number % DIFFICULTY.WAVE_BOSS_SPAWN_RATE === 0
      && this.spawnedEnemiesCount < Math.ceil(this.number / DIFFICULTY.WAVE_BOSS_SPAWN_RATE)
    ) {
      return EnemyVariant.BOSS;
    }

    const variants: EnemyVariant[] = [];

    eachEntries(ENEMIES, (type, Instance) => {
      if (Instance.SpawnMinWave <= this.number) {
        for (let k = 0; k < Instance.SpawnFrequency; k++) {
          variants.push(<EnemyVariant> type);
        }
      }
    });

    const variant: EnemyVariant = Phaser.Utils.Array.GetRandom(variants);

    return variant;
  }
}

registerAudioAssets(WaveAudio);
