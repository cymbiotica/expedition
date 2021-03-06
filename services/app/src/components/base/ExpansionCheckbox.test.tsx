import {mount} from 'app/Testing';
import * as React from 'react';

import ExpansionCheckBox, { Props } from './ExpansionCheckbox';

jest.useFakeTimers();

describe('ExpansionCheckBox', () => {

  function setup(contentSets=[]) {
    const props: Props = {
      onChange: jest.fn(),
      contentSets: new Set(contentSets),
      value: [],
    };
    const elem = mount(<ExpansionCheckBox {...props} />);
    return {elem, props};
  }

  test('changes search param values when onChange is clicked', () => {
    const {elem, props} = setup(['horror']);
    elem.find('Checkbox#horror').prop('onChange')('horror');
    expect(props.onChange).toHaveBeenCalledWith(['horror']);
  });

  test('default horror expansion is selected based on settings', () => {
    const {elem, props} = setup(['horror']);
    jest.runOnlyPendingTimers();
    expect(props.onChange).toHaveBeenCalledWith(['horror']);
    expect(elem.find('input#future').props().disabled).toBe(true);
  });

  test('default horror and future expansion is selected based on settings', () => {
    const {elem, props} = setup(['horror', 'future']);
    jest.runOnlyPendingTimers();
    expect(props.onChange).toHaveBeenCalledWith(['horror', 'future']);
  });

  test('default no expansion is selected based on settings', () => {
    const {elem, props} = setup([]);
    jest.runOnlyPendingTimers();
    expect(props.onChange).toHaveBeenCalledWith([]);
    expect(elem.find('input#horror').props().disabled).toBe(true);
    expect(elem.find('input#future').props().disabled).toBe(true);
  });

});
