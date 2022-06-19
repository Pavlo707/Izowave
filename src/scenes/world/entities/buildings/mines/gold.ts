import BuildingMine from '~scene/world/entities/buildings/mine';
import World from '~scene/world';

import { BuildingTexture, BuildingVariant, ResourceType } from '~type/building';

export default class BuildingMineGold extends BuildingMine {
  static Name = 'Gold mine';

  static Description = 'Generation gold\nHP: 1000';

  static Texture = BuildingTexture.MINE_GOLD;

  static Cost = { bronze: 30, silver: 35 };

  static UpgradeCost = { bronze: 15, silver: 15, gold: 30 };

  /**
   * Building variant constructor.
   */
  constructor(scene: World, positionAtMatrix: Phaser.Types.Math.Vector3Like) {
    super(scene, {
      positionAtMatrix,
      variant: BuildingVariant.MINE_GOLD,
      health: 1000,
      texture: BuildingMineGold.Texture,
      upgradeCost: BuildingMineGold.UpgradeCost,
      actions: {
        pause: 2000, // Pause between generations
      },
      resourceType: ResourceType.GOLD,
    });
  }
}
