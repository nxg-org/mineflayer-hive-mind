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

let hiveMind: CentralHiveMind | undefined

let bots: Bot[] = [];

async function run() {
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
        // bots.push({
        // });
    }
}

//I require all of the bots to be in context upon creation
//so, if there's bots on different tasks/threads
//I still need those bots by reference to the hivemind
//the only workaround is

async function main() {
    let follow = new BehaviorFollowEntity();
    let idle = new BehaviorIdle();
    let transitions = [
        new HiveTransition({
            parent: follow,
            child: idle,
        }),

        new HiveTransition({
            parent: idle,
            child: follow,
        }),
    ];

    let test = new NestedHiveMind({
        stateName: "root",
        bots: bots,
        autonomous: true,
        ignoreBusy: false,
        enter: idle,
        transitions: transitions,
    });

    await run();
    hiveMind = new CentralHiveMind(bots, test);
}

main();

rl.on("line", (input: string) => {
    const split = input.split(" ");
    switch (split[0]) {
        case "stop":
            hiveMind!.root.transitions[0].trigger();
            break;
        case "start":
            hiveMind!.root.transitions[1].trigger();
            break;
    }
});
