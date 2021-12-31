import EventEmitter from "events";
import { Bot } from "mineflayer";
import { NestedHiveMind } from "./HiveMindNested";
import { HiveBehavior, HiveTransition } from "./HiveMindStates";

export class CentralHiveMind extends EventEmitter {
    readonly bots: Bot[];

    readonly activeBots: Bot[]; //{[hivemindName: string]: Bot[]}
    readonly droppedBots: Bot[];

    readonly root: NestedHiveMind;

    readonly transitions: HiveTransition[];
    readonly states: typeof HiveBehavior[];
    readonly nestedHives: NestedHiveMind[];

    constructor(bots: Bot[], root: NestedHiveMind) {
        super();
        this.bots = bots;
        this.root = root;

        this.states = [];
        this.transitions = [];
        this.nestedHives = [];
        this.activeBots = [];
        this.droppedBots = [];
        this.findStatesRecursive(this.root);
        this.findTransitionsRecursive(this.root);
        this.findNestedHiveMinds(this.root);

        //lazy right now. implementing later.
        this.bots[0].on("physicsTick", () => this.update());

        this.root.active = true;
        this.root.onStateEntered();
    }

    public removeBots(bots: Bot[], override: boolean = false) {
        for (const bot of bots) {
            const index = this.bots.indexOf(bot);
            if (index > -1) this.bots.splice(index, 1);
            for (const mind of this.nestedHives) {
                if (mind.autonomous && !override) continue;
                const index = mind.bots.indexOf(bot);
                if (index > -1) mind.bots.splice(index, 1);
            }

            if (!this.droppedBots.includes(bot)) this.droppedBots.push(bot)
        }
    }

    public removeBotsFrom(hiveName: string, ...bots: Bot[]) {
        for (const mind of this.nestedHives) {
            if (mind.stateName === hiveName) {
                for (const bot of bots) {
                    const index = mind.bots.indexOf(bot);
                    if (index > -1) mind.bots.splice(index, 1);
                    if (!this.droppedBots.includes(bot)) this.droppedBots.push(bot)
                }
            }
        }

        
    }

    public addBots(...bots: Bot[]) {
        for (const bot of bots) {
            if (!this.bots.includes(bot)) this.bots.push(bot);
            for (const mind of this.nestedHives) {
                if (mind.autonomous) continue;
                if (!mind.bots.includes(bot)) this.bots.push(bot);
            }

            const index = this.droppedBots.indexOf(bot);
            if (index > -1) this.droppedBots.splice(index, 1);
        }
    }

    public addBotsTo(hiveName: string, ...bots: Bot[]) {
        for (const mind of this.nestedHives) {
            if (mind.stateName === hiveName) {
                for (const bot of bots) {
                    if (!mind.bots.includes(bot)) this.bots.push(bot);
                    const index = this.droppedBots.indexOf(bot);
                    if (index > -1) this.droppedBots.splice(index, 1);
                }
            }
        }
    }



    private findNestedHiveMinds(nested: NestedHiveMind, depth: number = 0): void {
        this.nestedHives.push(nested);
        nested.depth = depth;

        nested.on("stateChanged", () => this.emit("stateChanged"));
        nested.on("requestBots", this.provideBotsOnRequest)


        for (const state of nested.states) {
            if (state instanceof NestedHiveMind) {
                this.findNestedHiveMinds(state, depth + 1);
            }
        }
    }

    private findStatesRecursive(nested: NestedHiveMind): void {
        for (const state of nested.states) {
            this.states.push(state);

            if (state instanceof NestedHiveMind) {
                this.findStatesRecursive(state);
            }
        }
    }

    private findTransitionsRecursive(nested: NestedHiveMind): void {
        for (const trans of nested.transitions) {
            this.transitions.push(trans);
        }

        for (const state of nested.states) {
            if (state instanceof NestedHiveMind) {
                this.findTransitionsRecursive(state);
            }
        }
    }

    /**
     * Called each tick to update the root state machine.
     */
    private update(): void {
        this.root.update();
        for (const mind of this.nestedHives) {
            for (const stateName in mind.runningStates) {
                for (const state of mind.runningStates[stateName]) {
                    if (!this.activeBots.includes(state.bot)) this.activeBots.push(state.bot);
                }
            }
        }
    }


    private provideBotsOnRequest = (hivemind: NestedHiveMind, amount: number, exclusive: boolean) => {
        for (let i = 0; i < amount; i++) {
            const bot = this.bots[i]
            if (!bot) return;
            //if (!exclusive) this.bots.push(bot)
            hivemind.bots.push(bot);
        }
    }
}
