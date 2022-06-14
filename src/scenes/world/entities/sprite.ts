import Phaser from 'phaser';
import { equalPositions } from '~lib/utils';
import Level from '~scene/world/level';
import World from '~scene/world';

import { SpriteData } from '~type/sprite';
import { TileType } from '~type/level';

import { WORLD_COLLIDE_LOOK } from '~const/world';

export default class Sprite extends Phaser.Physics.Arcade.Sprite {
  // @ts-ignore
  readonly scene: World;

  // @ts-ignore
  readonly body: Phaser.Physics.Arcade.Body;

  /**
   * Child container.
   */
  private _container: Phaser.GameObjects.Container;

  public get container() { return this._container; }

  private set container(v) { this._container = v; }

  /**
   * Current tile.
   */
  private _tile: Phaser.GameObjects.Image;

  public get tile() { return this._tile; }

  private set tile(v) { this._tile = v; }

  /**
   *
   */
  private _positionAtMatrix: Phaser.Types.Math.Vector2Like;

  public get positionAtMatrix() { return this._positionAtMatrix; }

  private set positionAtMatrix(v) { this._positionAtMatrix = v; }

  /**
   * Sprite constructor.
   */
  constructor(scene: World, {
    texture, position, frame = 0,
  }: SpriteData) {
    const positionAtWorld = Level.ToWorldPosition({ ...position, z: 0 });
    super(scene, positionAtWorld.x, positionAtWorld.y, texture, frame);
    scene.add.existing(this);

    this.container = scene.add.container(this.x, this.y);
    this.container.setDepth(9998);

    // Configure physics
    scene.physics.world.enable(this, Phaser.Physics.Arcade.DYNAMIC_BODY);

    this.updateCurrentMeta();

    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      this.container.destroy();
    });
  }

  /**
   * Update event.
   */
  public update() {
    super.update();

    this.updateCurrentMeta();

    this.container.setVisible(this.visible);
    if (this.visible) {
      this.container.setPosition(this.x, this.y);
    }

    if (this.visible) {
      const depth = Level.GetDepth(this.y, 1, this.displayHeight);
      this.setDepth(depth);
    }
  }

  /**
   * Check if body is stopped.
   */
  public isStopped(): boolean {
    return equalPositions(this.body.velocity, { x: 0, y: 0 });
  }

  /**
   * Get collided tile by direction.
   *
   * @param direction - Current direction in degrees
   * @param tileTypes - List of tile types for check
   * @param ground - Flag for check ground tile
   */
  public getCollide(
    direction: number,
    tileTypes: TileType[],
    ground: boolean = true,
  ): boolean | Phaser.GameObjects.Image {
    const target = this.scene.physics.velocityFromAngle(direction, WORLD_COLLIDE_LOOK);
    const occupiedTiles = this.getCorners().map((point) => Level.ToMatrixPosition({
      x: point.x + target.x,
      y: point.y + target.y,
    }));

    for (const positionAtMatrix of occupiedTiles) {
      // If collide tile
      const tile = this.scene.level.getTileWithType({ ...positionAtMatrix, z: 1 }, tileTypes);
      if (tile) {
        return tile;
      }

      // If not collide ground tile
      if (ground) {
        if (!this.scene.level.getTile({ ...positionAtMatrix, z: 0 })) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get body corners.
   *
   * @param count - Count of corners
   */
  private getCorners(count: number = 12): Phaser.Types.Math.Vector2Like[] {
    const { position: { x, y }, width } = this.body;
    const r = width / 2;
    const l = Phaser.Math.PI2 / count;

    const points: Phaser.Types.Math.Vector2Like[] = [];
    for (let u = 0; u < count; u++) {
      points.push({
        x: (x + r) + Math.sin(u * l) * r,
        y: (y + r) - Math.cos(u * l) * r,
      });
    }

    return points;
  }

  /**
   * Update position at matrix and current tile.
   */
  private updateCurrentMeta() {
    this.positionAtMatrix = Level.ToMatrixPosition(this.body.position);

    const tilePosition = { ...this.positionAtMatrix, z: 0 };
    const tile = this.scene.level.getTile(tilePosition);
    if (tile) {
      this.tile = tile;
    } else {
      console.warn('Undefined tile of sprite meta');
    }
  }
}
