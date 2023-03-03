import { Bot, createBot } from "mineflayer";
import { CentralHiveMind, HiveMindWebserver, HiveTransition, NestedHiveMind } from "../src";

import { Move, Movements, pathfinder } from "mineflayer-pathfinder";
import { promisify } from "util";
import { BehaviorFollowEntity, BehaviorIdle, BehaviorLookAtEntity } from "../src/behaviors";
import { createInterface } from "readline";
import { createHiveMind } from "../src/NewHiveMindNested";
const sleep = promisify(setTimeout);

let rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const debug = true;

let hiveMind: CentralHiveMind | undefined;
let webserver: HiveMindWebserver | undefined;

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



async function report() {
  while (debug) {
    if (hiveMind) {
      console.log(hiveMind.root.activeStateType);
    }

    await sleep(5000);
  }
}



function main() {
    const bot = createBot({
      username: `testbot`,
      host: process.argv[2],
      port: Number(process.argv[3]),
      version: process.argv[4],
    });
  
    // let test = new NestedHiveMind({
    //   stateName: "root",
    //   bot: bot,
    //   autonomous: false,
    //   ignoreBusy: false,
    //   enter: BehaviorIdle,
    //   transitions: transitions,
    // });

    let test = createHiveMind({
        stateName: "root",
        transitions,
        enter: BehaviorIdle
    });
  
    console.log(test.name)
    hiveMind = new CentralHiveMind({
      bot: bot,
      root: test,
    });
    webserver = new HiveMindWebserver(hiveMind);
    webserver.startServer();
  }

report();
main();

