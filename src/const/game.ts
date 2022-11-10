import pkg from '../../package.json';

export const CONTAINER_ID = 'game-container';

export const AUDIO_VOLUME = 0.1;

export const MIN_VALID_SCREEN_SIZE = [800, 480];

export const COPYRIGHT = [
  'Copyright © 2022, Nikita Galadiy',
  `Version ${pkg.version} beta`,
];

export const REPOSITORY = pkg.repository.url.replace('git+', '');