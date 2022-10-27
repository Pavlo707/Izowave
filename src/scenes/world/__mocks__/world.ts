import { World } from '../world';

const world = {
  difficulty: 1,
  getTimerNow: jest.fn(),
  spawnEnemy: jest.fn(),
  enemies: {
    getTotalUsed: jest.fn(),
  },
  input: {
    keyboard: {
      on: jest.fn(),
    },
  },
  sound: {
    play: jest.fn(),
  },
} as unknown as World;

export default world;
