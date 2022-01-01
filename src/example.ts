import { Bot, createBot } from "mineflayer";
import { CentralHiveMind, HiveMindWebserver, HiveTransition, NestedHiveMind } from ".";

import { Move, Movements, pathfinder } from "mineflayer-pathfinder";
import { promisify } from "util";
import md from "minecraft-data";
import { BehaviorFollowEntity, BehaviorIdle, BehaviorLookAtEntity } from "./behaviors";
import { createInterface } from "readline";
const sleep = promisify(setTimeout);

let rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});


const debug = false


let hiveMind: CentralHiveMind | undefined;
let webserver: HiveMindWebserver | undefined;
let bots: Bot[] = [];
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

let test = new NestedHiveMind({
    stateName: "root",
    bots: bots,
    autonomous: false,
    ignoreBusy: false,
    enter: BehaviorIdle,
    transitions: transitions,
});

async function main() {
    for (let i = 0; i < 2; i++) {
        bots.push(
            createBot({
                username: `testbot_${i}`,
                host: "localhost",
                version: "1.17.1",
            })
        );
        bots[i].loadPlugin(pathfinder);
        await sleep(1000);
    }
    hiveMind = new CentralHiveMind(bots, test);
    webserver = new HiveMindWebserver(hiveMind);
    webserver.startServer();
}

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
            for (const key of Object.keys(hiveMind.root.runningStates)) {
                console.log(key, hiveMind.root.runningStates[key].length);
            }
        }

        await sleep(1000);
    }
}

main();
report();
