import Phaser from 'phaser';

import { CONTROL_KEY } from '~const/controls';
import { INTERFACE_TEXT_COLOR } from '~const/interface';
import { DIFFICULTY } from '~const/world/difficulty';
import { Building } from '~entity/building';
import { BuildingAmmunition } from '~entity/building/variants/ammunition';
import { Enemy } from '~entity/npc/variants/enemy';
import { ShotBall } from '~entity/shot/ball';
import { ShotLazer } from '~entity/shot/lazer';
import { calcGrowth, selectClosest } from '~lib/utils';
import { World } from '~scene/world';
import { ScreenIcon } from '~type/screen';
import { NoticeType } from '~type/screen/notice';
import {
  BuildingAction,
  BuildingAudio, BuildingParamItem, BuildingEvents, BuildingTowerData, BuildingTowerShotParams, BuildingVariant,
} from '~type/world/entities/building';
import { ShotParams } from '~type/world/entities/shot';

export class BuildingTower extends Building {
  /**
   * Shot params.
   */
  readonly shotParams: BuildingTowerShotParams;

  /**
   * Tower shot item.
   */
  readonly shot: ShotBall | ShotLazer;

  /**
   * Ammo left in clip.
   */
  private ammoLeft: number = DIFFICULTY.TOWER_AMMO_AMOUNT;

  /**
   * Building variant constructor.
   */
  constructor(scene: World, {
    shotData, ...data
  }: BuildingTowerData) {
    super(scene, data);

    const ShotInstance = shotData.instance;

    this.shot = new ShotInstance(this);
    this.shotParams = shotData.params;

    // Add keyboard events
    scene.input.keyboard.on(CONTROL_KEY.BUILDING_RELOAD, () => {
      if (this.isFocused) {
        this.reload();
      }
    });

    // Add events callbacks
    this.on(BuildingEvents.UPGRADE, this.upgradeAmmo, this);
    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      this.shot.destroy();
    });
  }

  /**
   * Add ammo left and reload to building info.
   */
  public getInfo(): BuildingParamItem[] {
    const info = super.getInfo();
    const params = this.getShotParams();

    if (params.speed) {
      info.push({
        label: 'SPEED',
        icon: ScreenIcon.SPEED,
        value: Math.round(params.speed / 10),
      });
    }

    info.push({
      label: 'AMMO',
      icon: ScreenIcon.AMMO,
      color: (this.ammoLeft === 0)
        ? INTERFACE_TEXT_COLOR.WARN
        : undefined,
      value: `${this.ammoLeft}/${this.getMaxAmmo()}`,
    });

    return info;
  }

  /**
   * Add reload to building actions.
   */
  public getActions(): BuildingAction[] {
    const actions = super.getActions();

    if (this.ammoLeft < this.getMaxAmmo()) {
      actions.push({
        label: 'RELOAD',
        onClick: () => this.reload(),
      });
    }

    return actions;
  }

  /**
   * Find target and shoot.
   */
  public update() {
    super.update();

    if (
      this.ammoLeft === 0
      || !this.isAllowAction()
      || this.scene.player.live.isDead()
    ) {
      return;
    }

    const target = this.getTarget();

    if (!target) {
      return;
    }

    this.shoot(target);
    this.pauseActions();

    this.ammoLeft--;
    if (this.ammoLeft === 0) {
      this.addAlert();
    }
  }

  /**
   * Get shot params.
   */
  public getShotParams(level?: number) {
    const params: ShotParams = {
      maxDistance: this.getActionsRadius(),
    };

    if (this.shotParams.speed) {
      params.speed = calcGrowth(
        this.shotParams.speed,
        DIFFICULTY.TOWER_SHOT_SPEED_GROWTH,
        level || this.upgradeLevel,
      );
    }

    if (this.shotParams.damage) {
      params.damage = calcGrowth(
        this.shotParams.damage,
        DIFFICULTY.TOWER_SHOT_DAMAGE_GROWTH,
        level || this.upgradeLevel,
      );
    }

    if (this.shotParams.freeze) {
      params.freeze = calcGrowth(
        this.shotParams.freeze,
        DIFFICULTY.TOWER_SHOT_FREEZE_GROWTH,
        level || this.upgradeLevel,
      );
    }

    return params;
  }

  /**
   * Get nearby ammunition.
   */
  private getAmmunition(): BuildingAmmunition {
    const ammunitions = <BuildingAmmunition[]> this.scene.selectBuildings(BuildingVariant.AMMUNITION);
    const nearby = ammunitions.filter((building: Building) => building.actionsAreaContains(this));

    if (nearby.length === 0) {
      return null;
    }

    const ammunition = nearby.sort((a, b) => (b.amountLeft - a.amountLeft))[0];

    if (ammunition.amountLeft === 0) {
      return null;
    }

    return ammunition;
  }

  /**
   * Reload ammo.
   */
  private reload() {
    const needAmmo = this.getMaxAmmo() - this.ammoLeft;

    if (needAmmo <= 0) {
      return;
    }

    const ammunition = this.getAmmunition();

    if (!ammunition) {
      this.scene.screen.message(NoticeType.ERROR, 'NO AMMUNITION NEARBY');

      return;
    }

    const ammo = ammunition.use(needAmmo);

    this.ammoLeft += ammo;

    this.scene.sound.play(BuildingAudio.RELOAD);
    this.removeAlert();
  }

  /**
   * Get maximum ammo in clip.
   */
  private getMaxAmmo(): number {
    return DIFFICULTY.TOWER_AMMO_AMOUNT * this.upgradeLevel;
  }

  /**
   * Update ammo left.
   */
  private upgradeAmmo() {
    this.ammoLeft = this.getMaxAmmo();
  }

  /**
   * Find nearby enemy for shoot.
   */
  private getTarget(): Enemy {
    const enemies = (<Enemy[]> this.scene.entityGroups.enemies.getChildren()).filter((enemy) => (
      !enemy.live.isDead()
      && this.actionsAreaContains(enemy)
    ));

    if (enemies.length === 0) {
      return null;
    }

    return selectClosest(enemies, this)[0];
  }

  /**
   * Shoot to enemy.
   *
   * @param target - Enemy
   */
  private shoot(target: Enemy) {
    const params = this.getShotParams();

    this.shot.shoot(target, params);
  }
}
