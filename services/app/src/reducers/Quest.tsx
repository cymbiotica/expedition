import Redux from 'redux';
import {Quest} from 'shared/schema/Quests';
import {PreviewQuestAction, QuestDetailsAction, QuestNodeAction} from '../actions/ActionTypes';
import {ParserNode} from '../components/views/quest/cardtemplates/TemplateTypes';
import {QuestState} from './StateTypes';

const cheerio = require('cheerio') as CheerioAPI;

export const initialQuestState: QuestState = {
  details: new Quest({
    author: '',
    id: '',
    partition: '',
    publishedurl: '',
    summary: '',
    title: '',
  }),
  node: new ParserNode(cheerio.load('<quest></quest>')('quest'), {
    _templateScopeFn: () => ({}),
    path: ([] as any),
    scope: {_: {}},
    templates: {},
    views: {},
  }),
  lastPlayed: null,
  savedTS: null,
};

export function quest(state: QuestState = initialQuestState, action: Redux.Action): QuestState {
  switch (action.type) {
    case 'QUEST_DETAILS':
      return {...state, details: (action as QuestDetailsAction).details};
    case 'QUEST_EXIT':
      return {...state, ...initialQuestState};
    case 'QUEST_NODE':
      return {...state,
        details: (action as QuestNodeAction).details || state.details,
        node: (action as QuestNodeAction).node,
      };
    case 'PREVIEW_QUEST':
      const pqa = action as PreviewQuestAction;
      return {
        ...state,
        details: pqa.quest,
        lastPlayed: pqa.lastPlayed || null,
        savedTS: pqa.savedTS || null,
      };
    default:
      return state;
  }
}
