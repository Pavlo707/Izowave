import Phaser from 'phaser';

export enum BuildingEvents {
  UPGRADE = 'upgrade',
}

export enum BuildingVariant {
  WALL = 'WALL',
  TOWER_FIRE = 'TOWER_FIRE',
  TOWER_FROZEN = 'TOWER_FROZEN',
  TOWER_LAZER = 'TOWER_LAZER',
  MINE_BRONZE = 'MINE_BRONZE',
  MINE_SILVER = 'MINE_SILVER',
  MINE_GOLD = 'MINE_GOLD',
  MEDIC = 'MEDIC',
}

export enum BuildingTexture {
  WALL = 'build/wall',
  TOWER_FIRE = 'build/tower_fire',
  TOWER_FROZEN = 'build/tower_frozen',
  TOWER_LAZER = 'build/tower_lazer',
  MINE_BRONZE = 'build/mine_bronze',
  MINE_SILVER = 'build/mine_silver',
  MINE_GOLD = 'build/mine_gold',
  MEDIC = 'build/medic',
}

export enum ResourceType {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
}

export type Resources = {
  [value in ResourceType]?: number
};

export type BuildingActionsParams = {
  radius?: number
  pause?: number
};

export type BuildingData = {
  variant: BuildingVariant
  health: number
  position: Phaser.Types.Math.Vector2Like // Position at matrix
  texture: BuildingTexture
  actions?: BuildingActionsParams
  upgradeCost: Resources
};

export interface BuildingInstance {
  Name: string
  Description: string
  Texture: BuildingTexture
  Cost: Resources
  Health: number
}

export type AssumedBuildPosition = {
  // Pointer in build area
  inArea: boolean
  // Pointer position is free
  isFree: boolean
  // Pointer biom is solid
  isSolid: boolean
};
