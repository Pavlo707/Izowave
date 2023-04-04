import React, { useContext, useState } from 'react';

import { BUILDINGS } from '~const/world/entities/buildings';
import { GameContext, useWorldUpdate } from '~lib/ui';
import { ComponentBuildingParameters } from '~scene/world/ui/building-parameters';
import { ComponentCost } from '~scene/world/ui/cost';
import { BuildingVariant } from '~type/world/entities/building';

import {
  Cost,
  Description,
  Header,
  Limit,
  Name,
  Wrapper,
} from './styles';

type Props = {
  variant: BuildingVariant
};

export const ComponentBuildingInfo: React.FC<Props> = ({ variant }) => {
  const game = useContext(GameContext);

  const [limit, setLimit] = useState(0);
  const [existCount, setExistCount] = useState(0);
  const [isAllow, setAllow] = useState(false);

  useWorldUpdate(() => {
    const currentIsAllow = game.world.builder.isBuildingAllowedByTutorial(variant)
      && game.world.builder.isBuildingAllowedByWave(variant);

    setAllow(currentIsAllow);

    if (currentIsAllow) {
      const currentLimit = game.world.builder.getBuildingLimit(variant);

      setLimit(currentLimit);
      if (currentLimit) {
        setExistCount(game.world.getBuildingsByVariant(variant).length);
      }
    }
  });

  return (
    <Wrapper>
      <Header>
        <Name>{BUILDINGS[variant].Name}</Name>
        {(isAllow && limit) && (
          <Limit>
            {existCount}/{limit}
          </Limit>
        )}
      </Header>
      <Description>{BUILDINGS[variant].Description}</Description>

      {isAllow && (
        <>
          <ComponentBuildingParameters params={BUILDINGS[variant].Params} />
          <Cost>
            <ComponentCost label='BUILDING COST' amount={BUILDINGS[variant].Cost} />
          </Cost>
        </>
      )}
    </Wrapper>
  );
};

ComponentBuildingInfo.displayName = 'ComponentBuildingInfo';
