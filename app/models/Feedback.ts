import * as Mail from '../Mail'
import {Quest, QuestAttributes, QuestInstance} from './Quests'
import * as Sequelize from 'sequelize'
import * as Promise from 'bluebird';

export type FeedbackType = 'feedback'|'rating'|'report_error'|'report_quest';

export interface FeedbackAttributes {
  partition: string;
  questid: string;
  userid: string;
  questversion?: number|null;
  created?: Date|null;
  rating?: number|null;
  text?: string|null;
  email?: string|null;
  name?: string|null;
  difficulty?: string|null;
  platform?: string|null;
  platformDump?: string|null; // TODO: Remove this from sequelize table attributes
  players?: number|null;
  version?: string|null;
  console?: string[]|null;
  anonymous?: boolean|null;
}

export interface FeedbackInstance extends Sequelize.Instance<FeedbackAttributes> {
  dataValues: FeedbackAttributes;
}

export type FeedbackModel = Sequelize.Model<FeedbackInstance, FeedbackAttributes>;

export class Feedback {
  protected s: Sequelize.Sequelize;
  protected mail: any;
  public model: FeedbackModel;
  protected quest: Quest;

  constructor(s: Sequelize.Sequelize) {
    this.s = s;
    this.model = this.s.define<FeedbackInstance, FeedbackAttributes>('feedback', {
      partition: {
        type: Sequelize.STRING(32),
        allowNull: false,
        primaryKey: true,
      },
      questid: {
        type: Sequelize.STRING(255),
        allowNull: false,
        primaryKey: true,
      },
      userid: {
        type: Sequelize.STRING(255),
        allowNull: false,
        primaryKey: true,
      },
      questversion: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      created: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      rating: Sequelize.INTEGER,
      text: Sequelize.STRING(2048),
      email: {
        type: Sequelize.STRING(255),
        validate: {
          isEmail: true,
        },
      },
      anonymous: Sequelize.BOOLEAN,
      name: Sequelize.STRING(255),
      difficulty: Sequelize.STRING(32),
      platform: Sequelize.STRING(32),
      players: Sequelize.INTEGER,
      version: Sequelize.STRING(32),
    }, {
      freezeTableName: true,
      timestamps: false, // TODO: eventually switch to sequelize timestamps
      underscored: true,
    });
  }

  public associate(models: {Quest: Quest}) {
    this.quest = models.Quest;
  }

  public get(partition: string, questid: string, userid: string): Promise<FeedbackInstance|null> {
    return this.s.authenticate()
      .then(() => {
        return this.model.findOne({where: {partition, questid, userid} as any});
      });
  }

  public getByQuestId(partition: string, questid: string): Promise<FeedbackInstance[]> {
    return this.s.authenticate()
      .then(() => {
        return this.model.findAll({where: {partition, questid, rating: {$ne: null}} as any});
      });
  };

  public submitFeedback(type: FeedbackType, feedback: FeedbackAttributes): Promise<any> {
    return this.s.authenticate()
      .then(() => {
        if (feedback.partition && feedback.questid) {
          return this.quest.get(feedback.partition, feedback.questid);
        }
        return null;
      })
      .then((questInstance: QuestInstance) => {
        const subject = `Feedback (${feedback.platform} v${feedback.version})`;
        let message = `
          <p>Feedback type: ${type}</p>
          <p></p>
          <p>Message: <em>${feedback.text}</em></p>
          <p></p>
        `;

        let q: QuestAttributes|null = null;
        if (questInstance) {
          q = this.quest.resolveInstance(questInstance);
        }

        if (q) {
          message += `
            <p>Quest: ${q.title}</p>
            <p>Author email: <a href="mailto:${q.email}">${q.email}</a></p>
            <p>Quest creator link: <a href="https://quests.expeditiongame.com/#${feedback.questid}">https://quests.expeditiongame.com/#${feedback.questid}</a></p>
          `;
        } else {
          message += `<p>Could not resolve published quest details for this feedback.</p>`;
        }
        
        message += `
          <p>User settings: ${feedback.players} adventurers on ${feedback.difficulty} difficulty.</p>
          <p>Raw platform string: ${feedback.platformDump}</p>
          <p>User email that reported it: <a href="mailto:${feedback.email}">${feedback.email}</a></p>
          <p>Console log record:</p>
          <pre>${feedback.console && feedback.console.join('\n')}</pre>
        `;
          
        // We do NOT send non-review feedback to authors - it's typically less actionable
        // so we'd likely need to do some initial triage.
        const to = ['expedition+feedback@fabricate.io'];
        return Mail.send(to, subject, message);
      })
      .then(() => {
        if (!feedback.email) {
          return;
        }

        const subject = `Expedition: thanks for your feedback!`;
        const message = `<p>We've received your feedback, and we'll respond back if we have any additional questions.</p>
        <p>For your own records, here's what you wrote:</p>
        <p></p>
        <p><em>${feedback.text}</em></p>
        <p></p>
        <p>Thanks again for taking the time to let us know how to improve Expedition! If you have any additional feedback
        or want to clarify any details, respond to this email or use the Feedback button in the app.</p>
        <p></p>
        <p>The Expedition Team</p>
        <p>expedition@fabricate.io</p>`
        const to = [feedback.email];
        return Mail.send(to, subject, message);
      });
  }

  public submitRating(feedback: FeedbackAttributes): Promise<any> {
    // Quest rating: Get quest, upsert feedback tagged with the current quest version,
    // Recalculate ratings on the quest, then send a mail if it's remarkable.
    return this.s.authenticate()
      .then(() => {
        return this.quest.get(feedback.partition, feedback.questid);
      })
      .then((quest: QuestInstance) => {
        if (!quest) {
          throw new Error('No such quest with id ' + feedback.questid);
        }

        feedback.questversion = quest.get('questversion');
        return this.model.upsert(feedback);
      })
      .then((created: Boolean) => {
        return this.quest.updateRatings(feedback.partition, feedback.questid);
      })
      .then((questInstance: QuestInstance) => {
        const q = this.quest.resolveInstance(questInstance);
        const ratingavg = q.ratingavg.toFixed(1);
        const emails = [];
        if (q.email) {
          emails.push(q.email);
        }
        if (!feedback.rating || feedback.rating <= 3) {
          emails.push('expedition+questfeedback@fabricate.io');
        }
        if (q.ratingcount === 1) {
          const subject = `Your quest just received its first rating!`;
          let message = `<p>${q.author},</p>
            <p>Your quest, ${q.title}, just received its first rating!</p>
            <p>${feedback.rating} out of 5 stars.</p>
          `;
          if (feedback.text && feedback.text.length > 0) {
            message += `<p>User feedback:</p><p>"${feedback.text}"</p>`;
          }
          if (feedback.email && !feedback.anonymous) {
            message += `<p>Reviewer email: <a href="mailto:${feedback.email}">${feedback.email}</a></p>`;
          }
          message += `<p>Link to edit quest: <a href="https://quests.expeditiongame.com/#${feedback.questid}">https://quests.expeditiongame.com/#${feedback.questid}</a></p>`;
          return Mail.send(emails, subject, message);
        } else if (feedback.text && feedback.text.length > 0) {
          const subject = `Quest rated ${feedback.rating}/5: ${q.title}`;
          let message = `<p>User feedback:</p>
            <p>"${feedback.text}"</p>
            <p>${feedback.rating} out of 5 stars</p>
            <p>New quest overall rating: ${ratingavg} out of 5 across ${q.ratingcount} ratings.</p>
            <p>Was submitted for ${q.title} by ${q.author}</p>
            <p>They played with ${feedback.players} adventurers on ${feedback.difficulty} difficulty on ${feedback.platform} v${feedback.version}.</p>
            <p>Link to edit quest: <a href="https://quests.expeditiongame.com/#${feedback.questid}">https://quests.expeditiongame.com/#${feedback.questid}</a></p>
          `;
          if (feedback.email && !feedback.anonymous) {
            message += `<p>Reviewer email: <a href="mailto:${feedback.email}">${feedback.email}</a></p>`;
          }
          return Mail.send(emails, subject, message);
        }
      });
  }

  public submitReportQuest(feedback: FeedbackAttributes): Promise<any> {
    return this.s.authenticate()
      .then(() => {
        return this.quest.get(feedback.partition, feedback.questid);
      })
      .then((questInstance: QuestInstance|null) => {
        if (!questInstance) {
          throw new Error('No such quest with id ' + feedback.questid);
        }
        const q = this.quest.resolveInstance(questInstance);

        const subject = `Quest reported: ${q.title}`;
        const message = `<p>Message: ${feedback.text}</p>
          <p>They played with ${feedback.players} adventurers on ${feedback.difficulty} difficulty on ${feedback.platform} v${feedback.version}.</p>
          <p>Raw platform string: ${feedback.platformDump}</p>
          <p>User email that reported it: <a href="mailto:${feedback.email}">${feedback.email}</a></p>
          <p>Link to edit quest: <a href="https://quests.expeditiongame.com/#${feedback.questid}">https://quests.expeditiongame.com/#${feedback.questid}</a></p>
        `;
        // Do NOT include quest author when user reports a quest.
        const to = ['expedition+apperror@fabricate.io'];
        return Mail.send(to, subject, message);
      });
  }
}
