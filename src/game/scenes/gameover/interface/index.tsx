import { useGame } from 'phaser-react-ui';
import React from 'react';

import { phrase } from '~lib/lang';
import { Button } from '~scene/system/interface/button';
import { Overlay } from '~scene/system/interface/overlay';
import { GameStat, IGame } from '~type/game';

import { Result } from './result';
import { Wrapper, Label } from './styles';

type Props = {
  stat: GameStat
  record: Nullable<GameStat>
};

export const GameoverUI: React.FC<Props> = ({ stat, record }) => {
  const game = useGame<IGame>();

  const onRestartClick = () => {
    game.stopGame();
  };

  return (
    <Overlay>
      <Wrapper>
        <Label>GAME OVER</Label>
        <Button onClick={onRestartClick} size="large" view="confirm">
          {phrase('PLAY_AGAIN')}
        </Button>
        <Result stat={stat} record={record} />
      </Wrapper>
    </Overlay>
  );
};

GameoverUI.displayName = 'GameoverUI';
