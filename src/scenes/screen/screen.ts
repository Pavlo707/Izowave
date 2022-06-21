import Phaser from 'phaser';
import { calcGrowth } from '~lib/utils';
import ComponentWave from '~scene/screen/components/wave';
import ComponentResources from '~scene/screen/components/resources';
import ComponentFPS from '~scene/screen/components/fps';
import ComponentBuilder from '~scene/screen/components/builder';
import ComponentGameOver from '~scene/screen/components/gameover';
import ComponentNotices from '~scene/screen/components/notices';
import ComponentBar from '~scene/screen/components/bar';
import World from '~scene/world';

import { WorldEvents } from '~type/world';
import { SceneKey } from '~type/scene';
import { PlayerEvents, PlayerStat } from '~type/player';
import { LiveEvents } from '~type/live';
import { Notice } from '~type/notice';

import { INTERFACE_PADDING } from '~const/interface';
import { EXPERIENCE_TO_NEXT_LEVEL, EXPERIENCE_TO_NEXT_LEVEL_GROWTH } from '~const/difficulty';

export default class Screen extends Phaser.Scene {
  readonly notices: Notice[] = [];

  constructor() {
    super(SceneKey.SCREEN);
  }

  create() {
    const { canvas } = this.sys;
    const world = <World> this.scene.get(SceneKey.WORLD);
    const components = this.add.group();

    const shift = { x: INTERFACE_PADDING, y: INTERFACE_PADDING };

    // Component wave
    const wave = ComponentWave.call(this, shift, {
      wave: world.wave,
    });
    shift.y += wave.height + INTERFACE_PADDING;
    components.add(wave);

    // Component health bar
    const health = ComponentBar.call(this, shift, {
      display: () => `${world.player.live.health}  HP`,
      value: () => world.player.live.health,
      maxValue: () => world.player.live.maxHealth,
      event: (callback: (amount: number) => void) => world.player.live.on(LiveEvents.HEAL, callback),
      color: 0xe4372c,
    });
    shift.y += health.height + 8;
    components.add(health);

    // Component experience bar
    const experience = ComponentBar.call(this, shift, {
      display: () => `${world.player.level}  LVL`,
      value: () => world.player.experience,
      maxValue: () => calcGrowth(EXPERIENCE_TO_NEXT_LEVEL, EXPERIENCE_TO_NEXT_LEVEL_GROWTH, world.player.level + 1),
      event: (callback: (amount: number) => void) => world.player.on(PlayerEvents.EXPERIENCE, callback),
      color: 0x1975c5,
    });
    shift.y += experience.height + INTERFACE_PADDING / 2;
    components.add(experience);

    // Component resources
    const resources = ComponentResources.call(this, shift, {
      player: world.player,
    });
    components.add(resources);

    // Component notices
    const notices = ComponentNotices.call(this, { x: canvas.width / 2, y: INTERFACE_PADDING });
    components.add(notices);

    // Component builder
    const builder = ComponentBuilder.call(this, { x: canvas.width - INTERFACE_PADDING, y: INTERFACE_PADDING }, {
      builder: world.builder,
      wave: world.wave,
      player: world.player,
    });
    components.add(builder);

    // Component fps
    const fps = ComponentFPS.call(this, { x: INTERFACE_PADDING, y: canvas.height - INTERFACE_PADDING });
    components.add(fps);

    world.events.on(WorldEvents.GAMEOVER, (stat: PlayerStat, record: PlayerStat) => {
      components.destroy(true);

      ComponentGameOver.call(this, { x: 0, y: 0 }, { stat, record });
    });
  }
}
