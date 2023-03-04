const { createBot } = require("mineflayer");
const { CentralStateMachine, StateMachineWebserver, StateTransition } = require("../lib");
const { BehaviorExit, BehaviorFollowEntity, BehaviorIdle, BehaviorLookAtEntity } = require("../lib/behaviors");
const { createInterface } = require("readline");
const { newNestedStateMachine } = require("../lib/stateMachineNested");

// Start demo

const firstTransitions = [

  // new StateTransition({
  //   parent: BehaviorIdle,
  //   child: BehaviorLookAtEntity,
  //   name: "idleToLook",
  // }),



  new StateTransition({
    parent: BehaviorIdle,
    child: BehaviorFollowEntity,
    name: "enterToFollow",
    shouldTransition: (data) => !!data.entity && data.entity.position.distanceTo(bot.entity.position) > 2,
    onTransition: (data) => console.log("hey"),
  }),


  new StateTransition({
    parent: BehaviorFollowEntity,
    child: BehaviorExit,
    name: "followToExit",
    shouldTransition: (data, state) =>  !data.entity || state.distanceToTarget() <= 2
  }),

];

const test = newNestedStateMachine({
  stateName: "good test",
  transitions: firstTransitions,
  enter: BehaviorIdle,
  exit: BehaviorExit,
});

const test1 = newNestedStateMachine({
  stateName: "good test 1",
  transitions: firstTransitions,
  enter: BehaviorIdle,
  exit: BehaviorExit,
});

const secondTransitions = [
  new StateTransition({
    parent: BehaviorIdle,
    child: BehaviorLookAtEntity,
    name: "idleToLook",
  }),

  new StateTransition({
    parent: BehaviorLookAtEntity,
    child: BehaviorIdle,
    name: "lookToIdle",
  }),

  new StateTransition({
    parent: BehaviorIdle,
    child: test,
    name: "idleToTest",
    onTransition: () => console.log("hi"),
  }),

  new StateTransition({
    parent: BehaviorIdle,
    child: test1,
    name: "idleToTest1",
    onTransition: () => console.log("hey"),
  }),

  new StateTransition({
    parent: test,
    child: BehaviorIdle,
    name: "testToIdle",
    shouldTransition: (data, state) => state.isFinished(),
  }),
];

const root = newNestedStateMachine({
  stateName: "root",
  transitions: secondTransitions,
  enter: BehaviorIdle,
});

const bot = createBot({
  username: `testbot`,
  host: process.argv[2],
  port: Number(process.argv[3]),
  version: process.argv[4],
});

bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

const stateMachine = new CentralStateMachine({ bot, root });
console.log("STATES:", stateMachine.states)
const webserver = new StateMachineWebserver(stateMachine);
webserver.startServer();

// bot.on("physicsTick", () =>
//   console.log(!!stateMachine.root.data?.entity, stateMachine.root.data?.entity?.position.distanceTo(bot.entity.position) > 2)
// );

// end demo

let rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const handle = (input) => {
  const split = input.split(" ");
  let target;
  switch (split[0]) {
    case "look":
      target = bot.nearestEntity((e) => e.type === "player" && e.id !== bot.entity.id);
      if (!target) return;
      stateMachine.root.data.entity = target;
      stateMachine.root.transitions[0].trigger();
      break;
    case "lookstop":
      delete stateMachine.root.data.target;
      stateMachine.root.transitions[1].trigger();
      break;
    case "come":
      target = bot.nearestEntity((e) => e.type === "player" && e.id !== bot.entity.id);
      if (!target) return;
      stateMachine.root.data.entity = target;
      stateMachine.root.transitions[2].trigger();
      break;
  }
};
rl.on("line", handle);
bot.on("chat", (username, message) => handle(message));


// (async () => {
//   while (true) {
//     const state = stateMachine.root.activeState;
//     if (isNestedStateMachine(state.constructor)) {
//       console.log("in nested:", { ...state.activeState, bot: {} }, state.activeStateType);
//     } else {
//       console.log("in root:", { ...state, bot: {} }, state.constructor);
//     }

//     await new Promise((res, rej) => setTimeout(res, 1000));
//   }
// })();

// stateMachine.on("stateEntered", (nested,state) => console.log("ENTERED:", {...nested, data:{}, staticRef: undefined, bot: undefined, activeState: undefined}, state));
// stateMachine.on("stateExited", (nested, state) => console.log("EXITED:", {...nested, data:{}, staticRef: undefined, bot: undefined, activeState: undefined}, state));
