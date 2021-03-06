import {configure, shallow} from 'enzyme';
import * as React from 'react';
import Adapter from 'enzyme-adapter-react-16';
import Navigation, {Props} from './Navigation';
import {Quest} from 'shared/schema/Quests';
configure({ adapter: new Adapter() });

describe('Navigation', () => {
  function setup(overrides?: Partial<Props>) {
    const props: Props = {
      cardTheme: 'light',
      card: {name: 'TUTORIAL_QUESTS'},
      questTheme: 'light',
      hasSearchResults: false,
      settings: null,
      toCard: jasmine.createSpy('toCard'),
      ...overrides,
    };
    const e = shallow(<Navigation {...(props as any as Props)} />, undefined /*renderOptions*/);
    return {props, e};
  }

  test('triggers toCard when nav changed', () => {
    const {props, e} = setup();
    e.prop('onChange')(null, 'SAVED_QUESTS');
    expect(props.toCard).toHaveBeenCalledWith('SAVED_QUESTS', false, null);
  });
  test('sets current value based on card name', () => {
    const {props, e} = setup();
    expect(e.prop('value')).toEqual(props.card.name);
  });
  test('safely handles an unknown card name', () => {
    const {props, e} = setup({card: {name: 'RANDOM_NAME'}});
    expect(e.html()).toContain('Tutorial');
  });
});
