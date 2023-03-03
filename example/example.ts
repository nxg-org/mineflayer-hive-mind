import { createBot } from "mineflayer";
import { CentralHiveMind, HiveMindWebserver, HiveTransition } from "../src";
import { BehaviorFollowEntity, BehaviorIdle, BehaviorLookAtEntity } from "../src/behaviors";
import { createInterface } from "readline";
import { newNestedHiveMind } from "../src/HiveMindNested";

// Start demo

let transitions = [
  new HiveTransition({
    parent: BehaviorIdle,
    child: BehaviorFollowEntity,
    name: "idleToFollow",
  }),
  new HiveTransition({
    parent: BehaviorFollowEntity,
    child: BehaviorIdle,
    name: "followToIdle",
  }),

  new HiveTransition({
    parent: BehaviorIdle,
    child: BehaviorLookAtEntity,
    name: "idleToLook",
  }),

  new HiveTransition({
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

const hiveMind = new CentralHiveMind({
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
