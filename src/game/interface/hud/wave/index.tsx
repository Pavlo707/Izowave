import cn from 'classnames';
import React, { useContext, useEffect, useState } from 'react';

import { WAVE_TIMELEFT_ALARM } from '~const/world/wave';
import { ComponentHint } from '~interface/plates/hint';
import { GameContext, useWorldUpdate } from '~lib/interface';
import { formatTime } from '~lib/utils';
import { TutorialStep } from '~type/tutorial';

import { CurrentNumber, State, Wrapper } from './styles';

export const ComponentWave: React.FC = () => {
  const game = useContext(GameContext);

  const [currentNumber, setCurrentNumber] = useState(1);
  const [value, setValue] = useState(null);
  const [isGoing, setGoing] = useState(false);
  const [isAlarm, setAlarm] = useState(false);
  const [isHintVisible, setHintVisible] = useState(false);
  const [isPeaceMode, setPeaceMode] = useState(false);

  useWorldUpdate(() => {
    setPeaceMode(game.world.wave.isPeaceMode);
    setCurrentNumber(game.world.wave.number);
    setGoing(game.world.wave.isGoing);

    if (game.world.wave.isGoing) {
      const enemiesLeft = game.world.wave.getEnemiesLeft();

      setValue(enemiesLeft);
      setAlarm(false);
    } else {
      const timeleft = game.world.wave.getTimeleft();

      setValue(formatTime(timeleft));
      setAlarm(timeleft <= WAVE_TIMELEFT_ALARM && !game.world.isTimePaused());
    }
  });

  const showHint = () => {
    setHintVisible(true);
  };

  const hideHint = () => {
    setHintVisible(false);
  };

  useEffect(() => game.tutorial.bind(TutorialStep.WAVE_TIMELEFT, {
    beg: showHint,
    end: hideHint,
  }), []);

  return !isPeaceMode && (
    <Wrapper>
      <CurrentNumber className={cn({ going: isGoing })}>
        {currentNumber}
      </CurrentNumber>
      <State>
        <State.Label>{isGoing ? 'ENEMIES LEFT' : 'TIME LEFT'}</State.Label>
        <State.Value className={cn({ alarm: isAlarm })}>
          {value}
        </State.Value>
      </State>

      {isHintVisible && (
        <ComponentHint side="left">
          Here display time left to start enemies attack
        </ComponentHint>
      )}
    </Wrapper>
  );
};

ComponentWave.displayName = 'ComponentWave';
