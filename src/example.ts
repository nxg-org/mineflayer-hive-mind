import { Bot, createBot } from "mineflayer";
import { CentralHiveMind, HiveTransition, NestedHiveMind } from ".";

import { Move, Movements, pathfinder } from "mineflayer-pathfinder";
import { promisify } from "util";
import md from "minecraft-data";
import { BehaviorFollowEntity } from "./behaviors";
import { BehaviorIdle } from "./behaviors/behaviorIdle";
import { createInterface } from "readline";
const sleep = promisify(setTimeout);

let rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});

let hiveMind: CentralHiveMind | undefined;
let bots: Bot[] = []
let transitions = [
    new HiveTransition({
        parent: BehaviorIdle,
        child: BehaviorFollowEntity,
    }),
    new HiveTransition({
        parent: BehaviorFollowEntity,
        child: BehaviorIdle,
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

    for (let i = 0; i < 1; i++) {
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
}

rl.on("line", (input: string) => {
    const split = input.split(" ");
    switch (split[0]) {
        case "start":
            hiveMind!.root.transitions[0].trigger();
            break;
        case "stop":
            hiveMind!.root.transitions[1].trigger();
            break;
    }
});


async function report() {

    while (true) {
        if (hiveMind){
            console.log(hiveMind.root.activeStateType)
            for (const key of Object.keys(hiveMind.root.runningStates)) {
                console.log(key, hiveMind.root.runningStates[key].length, hiveMind.root.bgTransitions)
            }
        }

        await sleep(1000)
    }
}

main();
report();