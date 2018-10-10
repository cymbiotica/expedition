import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Close from '@material-ui/icons/Close';
import NetworkWifi from '@material-ui/icons/NetworkWifi';
import SignalWifiOff from '@material-ui/icons/SignalWifiOff';
import * as React from 'react';
import {getMultiplayerClient} from '../../Multiplayer';
import {CardThemeType, DialogIDType, MultiplayerState} from '../../reducers/StateTypes';
import {playerOrder} from '../views/quest/cardtemplates/PlayerCount';
import MultiplayerIcon from './MultiplayerIcon';

export interface StateProps {
  multiplayer: MultiplayerState;
  cardTheme: CardThemeType;
  questTheme: string;
}

export interface DispatchProps {
  setDialog: (name: DialogIDType) => void;
}

export interface Props extends StateProps, DispatchProps {}

const MultiplayerFooter = (props: Props): JSX.Element => {
  const color = (props.cardTheme === 'dark') ? 'white' : 'black';
  // const adventurerIcon = (props.cardTheme === 'dark') ? 'images/adventurer_white_small.svg' : 'images/adventurer_small.svg';
  const peers: JSX.Element[] = [];
  const rpClient = getMultiplayerClient();

  const order = playerOrder(props.multiplayer.session && props.multiplayer.session.secret || '');
  const clients = Object.keys(props.multiplayer.clientStatus).sort();
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const lastStatus = props.multiplayer.clientStatus[client];
    if (!lastStatus.connected) {
      continue;
    }

    for (let j = 0; j < (lastStatus.numPlayers || 1); j++) {
      peers.push(<MultiplayerIcon key={`${client}${j}`} className={`inline_icon player${order[i]}`} />);
    }
  }

  // TODO: Indicate when waiting for other user action
  // TODO Icon colors here and in IconButton below
  const statusIcon = (
    <IconButton onClick={(e: any) => {props.setDialog('MULTIPLAYER_STATUS'); }}>
      {(rpClient.isConnected()) ? <NetworkWifi nativeColor={color} /> : <SignalWifiOff nativeColor={color} />}
    </IconButton>
  );

  return (
    <div className={`remote_footer card_theme_${props.cardTheme} quest_theme_${props.questTheme}`}>
      <IconButton onClick={(e: any) => {props.setDialog('EXIT_REMOTE_PLAY'); }}>
         <Close nativeColor={color} />
      </IconButton>
      <Button className="peers" onClick={() => {props.setDialog('MULTIPLAYER_PEERS'); }}>
        {peers}
      </Button>
      {statusIcon}
    </div>
  );
};

export default MultiplayerFooter;
