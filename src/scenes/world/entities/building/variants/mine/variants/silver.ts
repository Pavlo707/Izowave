import { DIFFICULTY } from '~const/difficulty';
import { World } from '~scene/world';
import { ScreenIcon } from '~type/screen';
import { BuildingVariant, BuildingTexture } from '~type/world/entities/building';
import { ResourceType } from '~type/world/resources';

import { BuildingMine } from '../mine';

export class BuildingMineSilver extends BuildingMine {
  static Name = 'Silver mine';

  static Description = [
    { text: 'Silver resource generation for builds and upgrades', type: 'text' },
    { text: 'Health: 400', icon: ScreenIcon.HEALTH },
    { text: 'Pause: 2.0 s', icon: ScreenIcon.PAUSE },
    { text: `Resources: ${DIFFICULTY.MINE_RESOURCES}`, icon: ScreenIcon.RESOURCES },
  ];

  static Texture = BuildingTexture.MINE_SILVER;

  static Cost = { bronze: 20, silver: 20 };

  static UpgradeCost = { bronze: 10, silver: 20, gold: 10 };

  static Health = 400;

  static Limit = DIFFICULTY.MINE_LIMIT;

  /**
   * Building variant constructor.
   */
  constructor(scene: World, positionAtMatrix: Phaser.Types.Math.Vector2Like) {
    super(scene, {
      positionAtMatrix,
      variant: BuildingVariant.MINE_SILVER,
      health: BuildingMineSilver.Health,
      texture: BuildingMineSilver.Texture,
      upgradeCost: BuildingMineSilver.UpgradeCost,
      actions: {
        pause: 2000, // Pause between generations
      },
      resourceType: ResourceType.SILVER,
    });
  }
}
