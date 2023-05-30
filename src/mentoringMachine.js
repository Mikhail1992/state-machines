import { assign, createMachine, interpret } from 'xstate';
import { format } from 'date-fns';

const lndManagerIds = [3];
const mentorIds = [5, 6];

const Status = {
  REQUESTED: 'REQUESTED',
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RETRO: 'RETRO',
  DONE: 'DONE',
};

const Priority = {
  LOW: 'LOW',
  HIGHT: 'HIGHT',
};

const Program = {
  INDIVIDUAL: 'INDIVIDUAL',
  GROUP: 'GROUP',
};

const DATE_FORMAT = 'dd-MM-yyyy';

const makeRequest = assign({
  tmId: (context, event) => event.payload.tmId,
  menteeId: (context, event) => event.payload.menteeId,
  technologies: (context, event) => event.payload.technologies,
  requestDate: () => format(new Date(), DATE_FORMAT),
  comment: (context, event) => event.payload.comment,
  status: () => Status.REQUESTED,
  priority: () => Priority.LOW,
});

const updateMentor = assign({
  mentorId: (context, event) => event.payload.mentorId,
});

const updateManager = assign({
  managerId: (context, event) => event.meta.userId,
  status: () => Status.PLANNED,
});

const startMentoring = assign({
  status: () => Status.IN_PROGRESS,
  startDate: () => format(new Date(), DATE_FORMAT),
  programType: (context, event) => event.payload.programType,
});

const completeMentoring = assign({
  status: () => Status.RETRO,
});

const completeMentoringCase = assign({
  status: () => Status.DONE,
  completedDate: () => format(new Date(), DATE_FORMAT),
});

const fillMentorFeedbackForm = assign({
  mentorFeedback: (context, event) => [
    ...context.mentorFeedback,
    event.payload,
  ],
});

const fillRequesterFeedbackForm = assign({
  requesterFeedback: (context, event) => [
    ...context.requesterFeedback,
    event.payload,
  ],
});

const fillMenteeFeedbackForm = assign({
  menteeFeedback: (context, event) => [
    ...context.menteeFeedback,
    event.payload,
  ],
});

const changeMentor = assign({
  candidatesHistory: (context) =>
    context.mentorId
      ? [...context.candidatesHistory, context.mentorId]
      : context.candidatesHistory,
  mentorId: () => undefined,
});

function isLnDManager(context, event) {
  return lndManagerIds.includes(event.meta.userId);
}

function isMentor(context, event) {
  return mentorIds.includes(event.meta.userId);
}

export const createMentoringMachine = (initState = 'pending', context = {}) =>
  createMachine(
    {
      predictableActionArguments: true,
      id: 'mentoring',
      initial: initState,
      context: {
        candidatesHistory: [],
        mentorFeedback: [],
        requesterFeedback: [],
        menteeFeedback: [],
        ...context,
      },
      states: {
        pending: {
          on: {
            MAKE_REQUEST: {
              target: 'mentorRequested',
              actions: 'makeRequest',
            },
          },
        },
        mentorRequested: {
          on: {
            ASSIGN_MANAGER: {
              target: 'managerAssigned',
              cond: 'isLnDManager',
              actions: 'updateManager',
            },
          },
        },
        managerAssigned: {
          on: {
            CREATE_CHAT: {
              target: 'chatCreated',
              cond: 'isLnDManager',
            },
          },
        },
        chatCreated: {
          on: {
            FIND_MENTOR: {
              target: 'mentorFound',
              cond: 'isLnDManager',
              actions: 'updateMentor',
            },
          },
        },
        mentorFound: {
          on: { ADD_MENTOR_INTO_CHAT: 'mentorAddedIntoChat' },
        },
        mentorAddedIntoChat: {
          on: {
            START_MENTORING: {
              target: 'mentoringStarted',
              cond: 'isMentor',
              actions: ['startMentoring'],
            },
          },
        },
        mentoringStarted: {
          on: {
            FINISH_MENTORING: {
              target: 'collectingFeedback',
              cond: 'isMentor',
              actions: ['completeMentoring'],
            },
          },
        },
        collectingFeedback: {
          on: {
            COMPLETE: { target: 'finish', actions: ['completeMentoringCase'] },
            FILL_MENTOR_FEEBACK: { actions: ['fillMentorFeedbackForm'] },
            FILL_REQUESTER_FEEDBACK: { actions: ['fillRequesterFeedbackForm'] },
            FILL_MENTEE_FEEDBACK: { actions: ['fillMenteeFeedbackForm'] },
          },
        },
        finish: {},
      },
      on: {
        CHANGE_MENTOR: {
          target: 'chatCreated',
          cond: 'isLnDManager',
          actions: ['changeMentor'],
        },
      },
    },
    {
      actions: {
        makeRequest,
        updateManager,
        updateMentor,
        startMentoring,
        completeMentoring,
        fillMentorFeedbackForm,
        fillRequesterFeedbackForm,
        fillMenteeFeedbackForm,
        completeMentoringCase,
        changeMentor,
      },
      guards: { isLnDManager, isMentor },
    }
  );

const list = [
  {
    id: 1,
    tmId: 1,
    menteeId: 1,
    technologies: ['NodeJS'],
    requestDate: '21-05-2023',
    comment: 'comment',
    status: 'Done',
    priority: 'LOW',
    managerId: 3,
    mentorId: 6,
    startDate: '21-05-2023',
    programType: 'INDIVIDUAL',
    completedDate: '21-05-2023',
  },
  {
    id: 2,
    tmId: 1,
    menteeId: 1,
    technologies: ['React', 'TS'],
    requestDate: '21-05-2023',
    comment: 'comment',
    status: 'Done',
    priority: 'LOW',
    managerId: 3,
    mentorId: 6,
    startDate: '21-05-2023',
    programType: 'INDIVIDUAL',
    completedDate: '21-05-2023',
  },
];

const machines = list.map((context) =>
  interpret(createMentoringMachine(undefined, context)).start()
);

const actor = machines[0];

actor.subscribe((state) => {
  console.log(state.value, state.context);
});

console.log(actor.state.nextEvents);

actor.send({
  type: 'MAKE_REQUEST',
  payload: {
    tmId: 1,
    menteeId: 1,
    technologies: ['React', 'TS'],
    comment: 'comment',
  },
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'ASSIGN_MANAGER',
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'CREATE_CHAT',
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'FIND_MENTOR',
  payload: {
    mentorId: 6,
  },
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'ADD_MENTOR_INTO_CHAT',
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'START_MENTORING',
  payload: {
    programType: Program.INDIVIDUAL,
  },
  meta: {
    userId: 5,
  },
});

actor.send({
  type: 'CHANGE_MENTOR',
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'FIND_MENTOR',
  payload: {
    mentorId: 6,
  },
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'ADD_MENTOR_INTO_CHAT',
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'START_MENTORING',
  payload: {
    programType: Program.INDIVIDUAL,
  },
  meta: {
    userId: 5,
  },
});

actor.send({
  type: 'FINISH_MENTORING',
  meta: {
    userId: 5,
  },
});

actor.send({
  type: 'FILL_MENTOR_FEEBACK',
  payload: {
    message: 'FILL_MENTOR_FEEBACK',
    rating: 6,
  },
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'FILL_MENTEE_FEEDBACK',
  payload: {
    message: 'FILL_MENTEE_FEEDBACK',
    rating: 6,
  },
  meta: {
    userId: 3,
  },
});

actor.send({
  type: 'COMPLETE',
  meta: {
    userId: 3,
  },
});
