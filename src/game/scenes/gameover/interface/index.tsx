import { useGame } from 'phaser-react-ui';
import React from 'react';

import { GameStat, IGame } from '~type/game';

import { ComponentStats } from './stats';
import {
  Overlay, Wrapper, Label, Restart,
} from './styles';

type Props = {
  stat: GameStat
  record: Nullable<GameStat>
};

export const GameoverUI: React.FC<Props> = ({ stat, record }) => {
  const game = useGame<IGame>();

  const handleRestartClick = () => {
    game.restartGame();
  };

  return (
    <Overlay>
      <Wrapper>
        <Label>GAME OVER</Label>
        <ComponentStats stat={stat} record={record} />
        <Restart onClick={handleRestartClick}>PLAY AGAIN</Restart>
      </Wrapper>
    </Overlay>
  );
};

GameoverUI.displayName = 'GameoverUI';
