import { createBot } from "mineflayer";
import { CentralStateMachine, HiveMindWebserver, StateTransition } from "../src";
import { BehaviorFollowEntity, BehaviorIdle, BehaviorLookAtEntity } from "../src/behaviors";
import { createInterface } from "readline";
import { newNestedHiveMind } from "../src/NestedStateMachine";

// Start demo

let transitions = [
  new StateTransition({
    parent: BehaviorIdle,
    child: BehaviorFollowEntity,
    name: "idleToFollow",
  }),
  new StateTransition({
    parent: BehaviorFollowEntity,
    child: BehaviorIdle,
    name: "followToIdle",
  }),

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
];

const bot = createBot({
  username: `testbot`,
  host: process.argv[2],
  port: Number(process.argv[3]),
  version: process.argv[4],
});

const test = newNestedHiveMind({
  stateName: "root",
  transitions,
  enter: BehaviorIdle,
});

const hiveMind = new CentralStateMachine({
  bot: bot,
  root: test,
});
const webserver = new HiveMindWebserver(hiveMind);
webserver.startServer();


// end demo


let rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  

rl.on("line", (input: string) => {
  const split = input.split(" ");
  switch (split[0]) {
    case "come":
      hiveMind!.root.transitions[0].trigger();
      break;
    case "movestop":
      hiveMind!.root.transitions[1].trigger();
      break;
    case "look":
      hiveMind!.root.transitions[2].trigger();
      break;
    case "lookstop":
      hiveMind!.root.transitions[3].trigger();
      break;
  }
});
