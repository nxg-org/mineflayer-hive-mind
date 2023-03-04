import { createBot } from "mineflayer";
import { CentralStateMachine, StateMachineWebserver, StateTransition } from "../src";
import { BehaviorExit, BehaviorFollowEntity, BehaviorIdle, BehaviorLookAtEntity } from "../src/behaviors";
import { createInterface } from "readline";
import { newNestedStateMachine } from "../src/stateMachineNested";

// Start demo

const firstTransitions = [
  new StateTransition({
    parent: BehaviorFollowEntity,
    child: BehaviorExit,
    name: "followToExit",
    shouldTransition: (data, state) => !data.entity || state.distanceToTarget() <= 5,
  }),
  new StateTransition({
    parent: BehaviorIdle,
    child: BehaviorFollowEntity,
    name: "enterToFollow",
    shouldTransition: (data) => !!data.entity && data.entity.position.distanceTo(bot.entity.position) > 5
  }),
];

const test = newNestedStateMachine({
  stateName: "good test",
  transitions: firstTransitions,
  enter: BehaviorIdle,
  exit: BehaviorExit
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
    onTransition: () => console.log("hi")
  }),

  new StateTransition({
    parent: test,
    child: BehaviorIdle,
    name: "testToIdle",
    shouldTransition: (data, state) => state.isFinished()
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

const webserver = new StateMachineWebserver(stateMachine);
webserver.startServer();

// end demo

let rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});


const handle = (input: string)=> {
  const split = input.split(" ");
  switch (split[0]) {
    case "look":
      stateMachine!.root.transitions[0].trigger();
      break;
    case "lookstop":
      stateMachine!.root.transitions[1].trigger();
      break;
    case "come":
      stateMachine!.root.transitions[2].trigger();
      break;
  }
}
rl.on("line", handle);
bot.on("chat", (username, message) => handle(message));


(async() => {
  while (true) {

    console.log(stateMachine.root.activeState);
    await new Promise((res, rej) => setTimeout(res, 1000));
  }
})();

// stateMachine.on("stateEntered", (nested,state) => console.log("ENTERED:", {...nested, data:{}, staticRef: undefined, bot: undefined, activeState: undefined}, state));
// stateMachine.on("stateExited", (nested, state) => console.log("EXITED:", {...nested, data:{}, staticRef: undefined, bot: undefined, activeState: undefined}, state));