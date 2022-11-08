import Phaser from 'phaser';

import { CONTROL_KEY } from '~const/controls';
import { WORLD_DEPTH_EFFECT, WORLD_DEPTH_UI } from '~const/world';
import { DIFFICULTY } from '~const/world/difficulty';
import { BUILDING_MAX_UPGRADE_LEVEL } from '~const/world/entities/building';
import { TILE_META } from '~const/world/level';
import { registerAudioAssets, registerSpriteAssets } from '~lib/assets';
import { calcGrowth } from '~lib/utils';
import { ComponentBuildingInfo } from '~scene/screen/components/building-info';
import { ComponentCost } from '~scene/screen/components/building-info/cost';
import { ComponentHelp } from '~scene/screen/components/help';
import { World } from '~scene/world';
import { Effect } from '~scene/world/effects';
import { Hexagon } from '~scene/world/hexagon';
import { Level } from '~scene/world/level';
import { Live } from '~scene/world/live';
import { GameEvents } from '~type/game';
import { ScreenIcon, ScreenTexture } from '~type/screen';
import { NoticeType } from '~type/screen/notice';
import { TutorialEvent, TutorialStep } from '~type/tutorial';
import { BuilderEvents } from '~type/world/builder';
import { EffectTexture } from '~type/world/effects';
import {
  BuildingActionsParams, BuildingData, BuildingEvents, BuildingAudio,
  BuildingTexture, BuildingVariant, BuildingParamItem, BuildingMeta, BuildingAction, BuildingOutlineState,
} from '~type/world/entities/building';
import { LiveEvents } from '~type/world/entities/live';
import { TileType } from '~type/world/level';

export class Building extends Phaser.GameObjects.Image {
  readonly scene: World;

  /**
   * Health managment.
   */
  readonly live: Live;

  /**
   * Variant name.
   */
  readonly variant: BuildingVariant;

  /**
   * Position at matrix.
   */
  readonly positionAtMatrix: Phaser.Types.Math.Vector2Like;

  /**
   * Current upgrade level.
   */
  private _upgradeLevel: number = 1;

  public get upgradeLevel() { return this._upgradeLevel; }

  private set upgradeLevel(v) { this._upgradeLevel = v; }

  /**
   * Actions parameters.
   */
  private actions: BuildingActionsParams;

  /**
   * Action pause.
   */
  private nextActionTimestamp: number = 0;

  /**
   * Building info UI component.
   */
  private info: Nullable<Phaser.GameObjects.Container> = null;

  /**
   * Building help UI component.
   */
  private help: Nullable<Phaser.GameObjects.Container> = null;

  /**
   * Alert.
   */
  private alert: Nullable<Phaser.GameObjects.Image> = null;

  /**
   * Current outline state.
   */
  private outlineState: BuildingOutlineState = BuildingOutlineState.NONE;

  /**
   *
   */
  private outlineTween: Nullable<Phaser.Tweens.Tween> = null;

  /**
   * Action area.
   */
  private actionsArea: Nullable<Phaser.GameObjects.Ellipse> = null;

  /**
   * Focus state.
   */
  private _isFocused: boolean = false;

  public get isFocused() { return this._isFocused; }

  private set isFocused(v) { this._isFocused = v; }

  /**
   * Select state.
   */
  private isSelected: boolean = false;

  /**
   * Building constructor.
   */
  constructor(scene: World, {
    positionAtMatrix, health, texture, actions, variant,
  }: BuildingData) {
    const tilePosition = { ...positionAtMatrix, z: 1 };
    const positionAtWorld = Level.ToWorldPosition(tilePosition);

    super(scene, positionAtWorld.x, positionAtWorld.y, texture);
    scene.add.existing(this);
    scene.entityGroups.buildings.add(this);

    this.live = new Live(health);
    this.actions = actions;
    this.variant = variant;
    this.positionAtMatrix = positionAtMatrix;

    this.setInteractive();
    this.addActionArea();

    scene.builder.addFoundation(positionAtMatrix);

    // Configure tile

    this.setOrigin(0.5, TILE_META.origin);
    this.setDepth(Level.GetTileDepth(positionAtWorld.y, tilePosition.z));
    scene.level.putTile(this, TileType.BUILDING, tilePosition);
    scene.level.refreshNavigationMeta();

    // Add keyboard events

    scene.input.keyboard.on(CONTROL_KEY.BUILDING_DESTROY, () => {
      if (this.isFocused) {
        this.remove();
      }
    });
    scene.input.keyboard.on(CONTROL_KEY.BUILDING_UPGRADE, () => {
      if (this.isFocused) {
        this.nextUpgrade();
      }
    });

    // Add events callbacks

    this.live.on(LiveEvents.DAMAGE, () => {
      this.onDamage();
    });
    this.live.on(LiveEvents.DEAD, () => {
      this.onDead();
    });

    this.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.onFocus();
    });
    this.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.onUnfocus();
    });
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      this.onClick();
    });
    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.isFocused) {
        this.onUnclick();
      }
    });

    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      this.scene.level.removeTile(tilePosition);
      this.scene.level.refreshNavigationMeta();
      this.onUnfocus();
      this.onUnclick();
      this.removeActionArea();
      this.removeAlert();
    });

    this.scene.game.events.on(GameEvents.FINISH, () => {
      this.onUnfocus();
      this.onUnclick();
    });

    this.scene.builder.on(BuilderEvents.BUILD_START, () => {
      this.onUnfocus();
      this.onUnclick();
    });

    // Tutorial help

    if (variant === BuildingVariant.TOWER_FIRE) {
      this.scene.game.tutorial.on(TutorialEvent.PROGRESS, (step: TutorialStep) => {
        if (step === TutorialStep.UPGRADE_BUILDING) {
          this.help = ComponentHelp(this.scene, {
            message: 'Click on building to upgrade',
            side: 'top',
          });

          this.help.setDepth(WORLD_DEPTH_UI);
          this.help.setPosition(
            this.x,
            this.y + TILE_META.height,
          );
        } else if (this.help) {
          this.help.destroy();
          this.help = null;
        }
      });
    }
  }

  /**
   * Set interactive by hexagon shape.
   */
  public setInteractive() {
    const shape = new Hexagon(0, 0, TILE_META.halfHeight);

    return super.setInteractive(shape, Hexagon.Contains);
  }

  /**
   * Event update.
   */
  public update() {
    if (this.alert) {
      this.alert.setVisible(this.visible);
    }

    let outlineState = BuildingOutlineState.NONE;

    if (this.isSelected) {
      outlineState = BuildingOutlineState.SELECTED;
    } else if (this.isFocused) {
      outlineState = BuildingOutlineState.FOCUSED;
    } else if (this.alert) {
      outlineState = BuildingOutlineState.ALERT;
    }
    this.setOutline(outlineState);
  }

  /**
   * Check if position inside action area.
   *
   * @param position - Position at world
   */
  public actionsAreaContains(position: Phaser.Types.Math.Vector2Like): boolean {
    if (!this.actionsArea) {
      return false;
    }

    const offset = this.actionsArea.getTopLeft();

    return this.actionsArea.geom.contains(position.x - offset.x, position.y - offset.y);
  }

  /**
   * Pause actions.
   */
  public pauseActions() {
    if (!this.actions?.pause) {
      return;
    }

    this.nextActionTimestamp = this.scene.getTimerNow() + this.getActionsPause();
  }

  /**
   * Check if actions is not pused.
   */
  public isAllowAction(): boolean {
    if (!this.actions?.pause) {
      return true;
    }

    return (this.nextActionTimestamp < this.scene.getTimerNow());
  }

  /**
   * Get building information params.
   */
  public getInfo(): BuildingParamItem[] {
    return [{
      label: 'HEALTH',
      icon: ScreenIcon.HEALTH,
      value: this.live.health,
    }];
  }

  /**
   * Get building actions.
   */
  public getActions(): BuildingAction[] {
    const actions: BuildingAction[] = [];

    if (this.isAllowUpgrade()) {
      actions.push({
        label: 'UPGRADE',
        addon: {
          component: ComponentCost,
          props: {
            player: this.scene.player,
            amount: () => this.getUpgradeLevelCost(),
          },
        },
        onClick: () => {
          this.nextUpgrade();
        },
      });
    }

    return actions;
  }

  /**
   * Get next upgrade cost.
   */
  public getUpgradeLevelCost(): number {
    const nextLevel = this.upgradeLevel + 1;
    const costGrow = this.getMeta().Cost / BUILDING_MAX_UPGRADE_LEVEL;

    return Math.round(costGrow * nextLevel);
  }

  /**
   * Get building meta.
   */
  public getMeta(): BuildingMeta {
    return (this.constructor as unknown as BuildingMeta);
  }

  /**
   * Get actions radius.
   */
  public getActionsRadius(): number {
    return this.actions?.radius
      ? calcGrowth(
        this.actions.radius,
        DIFFICULTY.BUILDING_ACTION_RADIUS_GROWTH,
        this.upgradeLevel,
      )
      : 0;
  }

  /**
   * Get actions pause.
   */
  private getActionsPause(): number {
    return this.actions?.pause
      ? calcGrowth(
        this.actions.pause,
        DIFFICULTY.BUILDING_ACTION_PAUSE_GROWTH,
        this.upgradeLevel,
      )
      : 0;
  }

  /**
   * Check if building allow upgrade.
   */
  private isAllowUpgrade(): boolean {
    return (this.upgradeLevel < BUILDING_MAX_UPGRADE_LEVEL && !this.scene.wave.isGoing);
  }

  /**
   * Upgrade building to next level.
   */
  private nextUpgrade() {
    if (!this.isAllowUpgrade()) {
      return;
    }

    const waveAllowed = this.getWaveAllowUpgrade();

    if (waveAllowed > this.scene.wave.getCurrentNumber()) {
      this.scene.game.screen.message(NoticeType.ERROR, `UPGRADE BE AVAILABLE ON ${waveAllowed} WAVE`);

      return;
    }

    const cost = this.getUpgradeLevelCost();

    if (this.scene.player.resources < cost) {
      this.scene.game.screen.message(NoticeType.ERROR, 'NOT ENOUGH RESOURCES');

      return;
    }

    this.upgradeLevel++;

    this.emit(BuildingEvents.UPGRADE);

    this.updateActionArea();
    this.setFrame(this.upgradeLevel - 1);
    this.live.heal();

    this.scene.player.takeResources(cost);
    this.scene.player.giveExperience(DIFFICULTY.BUILDING_UPGRADE_EXPERIENCE * (this.upgradeLevel - 1));

    this.scene.sound.play(BuildingAudio.UPGRADE);
    this.scene.game.screen.message(NoticeType.INFO, 'BUILDING UPGRADED');

    // Tutorial progress
    if (this.scene.game.tutorial.step === TutorialStep.UPGRADE_BUILDING) {
      this.scene.game.tutorial.progress(TutorialStep.IDLE);
    }
  }

  /**
   *
   */
  private getWaveAllowUpgrade(): number {
    return (this.getMeta().AllowByWave || 1) + this.upgradeLevel;
  }

  /**
   * Event damage.
   */
  private onDamage() {
    if (!this.visible) {
      return;
    }

    new Effect(this.scene, {
      texture: EffectTexture.DAMAGE,
      position: this,
      rate: 14,
    });
  }

  /**
   * Event dead.
   */
  private onDead() {
    this.scene.game.screen.message(NoticeType.WARN, `${this.getMeta().Name} HAS BEEN DESTROYED`);

    if (this.visible) {
      new Effect(this.scene, {
        texture: EffectTexture.SMOKE,
        audio: BuildingAudio.DEAD,
        position: {
          x: this.x,
          y: this.y + TILE_META.halfHeight,
        },
        rate: 18,
      });
    }

    this.destroy();
  }

  /**
   * Event focus.
   */
  private onFocus() {
    if (
      this.isFocused
      || this.scene.player.live.isDead()
      || this.scene.builder.isBuild
    ) {
      return;
    }

    this.isFocused = true;

    this.scene.input.setDefaultCursor('pointer');
  }

  /**
   * Event unfocus.
   */
  private onUnfocus() {
    if (!this.isFocused) {
      return;
    }

    this.isFocused = false;

    this.scene.input.setDefaultCursor('default');
  }

  /**
   * Event click.
   */
  private onClick() {
    if (!this.isFocused || this.isSelected) {
      return;
    }

    this.isSelected = true;

    this.addInfo();
    if (this.actionsArea) {
      this.actionsArea.setVisible(true);
    }
  }

  /**
   * Event unclick.
   */
  private onUnclick() {
    if (!this.isSelected) {
      return;
    }

    this.isSelected = false;

    this.removeInfo();
    if (this.actionsArea) {
      this.actionsArea.setVisible(false);
    }
  }

  /**
   * Set outline state.
   */
  private setOutline(state: BuildingOutlineState) {
    if (this.outlineState === state) {
      return;
    }

    if (state === BuildingOutlineState.NONE) {
      this.removeShader('OutlineShader');

      this.outlineTween.destroy();
      this.outlineTween = null;
    } else {
      const color: number = {
        [BuildingOutlineState.FOCUSED]: 0xffffff,
        [BuildingOutlineState.SELECTED]: 0xd0ff4f,
        [BuildingOutlineState.ALERT]: 0xffa200,
      }[state];

      if (this.outlineState === BuildingOutlineState.NONE) {
        this.addShader('OutlineShader', {
          size: 0.0,
          color,
        });

        this.outlineTween = <Phaser.Tweens.Tween> this.scene.tweens.add({
          targets: this,
          shaderSize: { from: 0.0, to: 3.0 },
          duration: 350,
          ease: 'Linear',
          yoyo: true,
          repeat: -1,
          onUpdate: (_, __, ___, size: number) => {
            this.updateShader('OutlineShader', { size });
          },
        });
      } else {
        this.updateShader('OutlineShader', { color });
      }
    }

    this.outlineState = state;
  }

  /**
   * Add information component.
   */
  private addInfo() {
    if (this.info) {
      return;
    }

    if (this.help) {
      this.help.setVisible(false);
    }

    this.info = ComponentBuildingInfo(this.scene, {
      name: this.getMeta().Name,
      upgradeLevel: () => this.upgradeLevel,
      params: () => this.getInfo(),
      actions: () => this.getActions(),
    });

    this.info.setDepth(WORLD_DEPTH_UI);
    this.info.setPosition(
      this.x - this.info.width / 2,
      this.y - this.info.height - TILE_META.halfHeight,
    );
  }

  /**
   * Remove information component.
   */
  private removeInfo() {
    if (!this.info) {
      return;
    }

    this.info.destroy();
    this.info = null;

    if (this.help) {
      this.help.setVisible(true);
    }
  }

  /**
   * Add alert sign.
   */
  public addAlert() {
    if (this.alert) {
      return;
    }

    this.alert = this.scene.add.image(this.x, this.y, ScreenTexture.ALERT);
    this.alert.setDepth(WORLD_DEPTH_EFFECT);
    this.alert.setVisible(this.visible);
  }

  /**
   * Remove alert sign.
   */
  public removeAlert() {
    if (!this.alert) {
      return;
    }

    this.alert.destroy();
    this.alert = null;
  }

  /**
   * Add action area.
   */
  private addActionArea() {
    if (!this.actions?.radius || this.actionsArea) {
      return;
    }

    this.actionsArea = this.scene.add.ellipse(this.x, this.y + TILE_META.halfHeight);
    this.actionsArea.setStrokeStyle(2, 0xffffff, 0.5);
    this.actionsArea.setFillStyle(0xffffff, 0.2);
    this.actionsArea.setVisible(false);

    this.updateActionArea();
  }

  /**
   * Update size and depth of action area.
   */
  private updateActionArea() {
    if (!this.actionsArea) {
      return;
    }

    const { persperctive, height, halfHeight } = TILE_META;
    const d = this.getActionsRadius() * 2;
    const out = height * 2;

    this.actionsArea.setSize(d, d * persperctive);
    this.actionsArea.setDepth(Level.GetDepth(this.y + halfHeight, 1, d * persperctive + out));
    this.actionsArea.updateDisplayOrigin();
  }

  /**
   * Remove action area.
   */
  private removeActionArea() {
    if (!this.actionsArea) {
      return;
    }

    this.actionsArea.destroy();
    this.actionsArea = null;
  }

  /**
   * Break building.
   */
  private remove() {
    if (this.visible) {
      new Effect(this.scene, {
        texture: EffectTexture.SMOKE,
        audio: BuildingAudio.REMOVE,
        position: {
          x: this.x,
          y: this.y + TILE_META.halfHeight,
        },
        rate: 18,
      });
    }

    this.destroy();
  }
}

registerAudioAssets(BuildingAudio);
registerSpriteAssets(BuildingTexture, {
  width: TILE_META.width,
  height: TILE_META.height,
});
