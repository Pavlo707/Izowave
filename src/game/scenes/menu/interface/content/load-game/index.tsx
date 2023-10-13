import { useGame } from 'phaser-react-ui';
import React, { useState } from 'react';

import { phrase } from '~lib/lang';
import { Storage } from '~lib/storage';
import { Button } from '~scene/system/interface/button';
import { Table } from '~scene/system/interface/table';
import { IGame } from '~type/game';

import { Wrapper, Empty } from './styles';

export const LoadGame: React.FC = () => {
  const game = useGame<IGame>();

  const [selectedSave, setSelectedSave] = useState(Storage.Saves[0]);
  const [saves, setSaves] = useState(Storage.Saves);

  const onClickStart = () => {
    game.continueGame(selectedSave);
  };

  const deleteSave = (event: MouseEvent, name: string) => {
    event.stopPropagation();

    // eslint-disable-next-line no-alert
    if (window.confirm('Do you confirm delete this save?')) {
      Storage.DeleteSave(name).then(() => {
        setSaves([...Storage.Saves]);
        if (selectedSave.name === name) {
          setSelectedSave(Storage.Saves[0]);
        }
      });
    }
  };

  return (
    <Wrapper>
      {saves.length === 0 ? (
        <Empty>{phrase('SAVES_NOT_FOUND')}</Empty>
      ) : (
        <Table>
          <Table.Head>
            <Table.HeadRow>
              <Table.Cell>{phrase('SAVE_NAME')}</Table.Cell>
              <Table.Cell>{phrase('PLANET')}</Table.Cell>
              <Table.Cell>{phrase('DIFFICULTY')}</Table.Cell>
              <Table.Cell>{phrase('WAVE')}</Table.Cell>
              <Table.Cell>{phrase('SCORE')}</Table.Cell>
              <Table.Cell>{phrase('SAVE_DATE')}</Table.Cell>
              <Table.Cell />
            </Table.HeadRow>
          </Table.Head>
          <Table.Body>
            {saves.map((save) => (
              <Table.BodyRow
                key={save.name}
                onClick={() => setSelectedSave(save)}
                $active={save.name === selectedSave.name}
              >
                <Table.Cell>{save.name}</Table.Cell>
                <Table.Cell>{phrase(save.payload.level.planet)}</Table.Cell>
                <Table.Cell>{phrase(save.payload.game.difficulty)}</Table.Cell>
                <Table.Cell>{save.payload.wave.number}</Table.Cell>
                <Table.Cell>{save.payload.player.score}</Table.Cell>
                <Table.Cell>{new Date(save.date).toLocaleString()}</Table.Cell>
                <Table.Cell
                  $type="delete"
                  onClick={(event: MouseEvent) => deleteSave(event, save.name)}
                >
                  X
                </Table.Cell>
              </Table.BodyRow>
            ))}
          </Table.Body>
        </Table>
      )}
      <Button
        view="primary"
        size="medium"
        onClick={onClickStart}
        disabled={saves.length === 0}
      >
        {phrase('START')}
      </Button>
    </Wrapper>
  );
};
