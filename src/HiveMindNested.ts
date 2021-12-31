import EventEmitter from "events";
import { Bot } from "mineflayer";
import { HiveBehavior, HiveTransition } from "./HiveMindStates";

export interface NestedHiveMindOptions {
    stateName: string;
    bots: Bot[];
    transitions: HiveTransition[];
    enter: HiveBehavior;
    exit?: HiveBehavior;
    autonomous: boolean;
    ignoreBusy: boolean;
}

export class NestedHiveMind extends EventEmitter implements NestedHiveMindOptions {
    /**
     * Work separate from Central Hive Mind unless forced to comply.
     * Allows modularity.
     */
    readonly autonomous: boolean;

    /**
     * Ignore bots if they are currently busy with a task.
     */
    readonly ignoreBusy: boolean;

    readonly stateName: string;

    /**
     * Bots available to the hivemind.
     */
    readonly bots: Bot[];

    /**
     * A list of bots currently executing a task.
     * Higher levels may ignore these bots.
     */
    readonly activeBots: { [behaviorName: string]: Bot[] };

    /**
     * A list of states for the bots in the hive mind.
     */
    readonly states: HiveBehavior[];

    /**
     * A list of transitions between states.
     */
    readonly transitions: HiveTransition[];

    /**
     * Autonomous behaviors that have not yet finished executing.
     */
    readonly backgroundStates: HiveBehavior[];

    activeState?: HiveBehavior;
    readonly enter: HiveBehavior;
    readonly exit?: HiveBehavior;
    depth: number = 0;

    /**
     * Whether or not this state machine layer is active.
     */
    active: boolean = false;

    constructor({
        stateName: name,
        bots,
        transitions,
        enter,
        exit = undefined,
        autonomous = false,
        ignoreBusy = false,
    }: NestedHiveMindOptions) {
        super();
        this.stateName = name;
        this.autonomous = autonomous;
        this.ignoreBusy = ignoreBusy;
        this.bots = bots;
        this.transitions = transitions;
        this.enter = enter;
        this.exit = exit;
        this.activeBots = {};
        this.backgroundStates = [];
        this.states = this.findStates();
        this.recognizeStates();
    }

    private recognizeStates(): void {
        for (const state of this.states) {
            this.activeBots[state.stateName] ??= [];
        }
    }

    private findStates(): HiveBehavior[] {
        const states = [];
        states.push(this.enter);

        if (this.exit != null) {
            if (!states.includes(this.exit)) {
                states.push(this.exit);
            }
        }

        for (let i = 0; i < this.transitions.length; i++) {
            const trans = this.transitions[i];

            if (!states.includes(trans.parentState)) {
                states.push(trans.parentState);
            }

            if (!states.includes(trans.childState)) {
                states.push(trans.childState);
            }
        }
        return states;
    }

    private getUsableBots(): Bot[] {
        const usable = [];
        for (const bot of this.bots) {
            if (this.ignoreBusy && Object.values(this.activeBots).some((botList) => botList.includes(bot))) continue;
            usable.push(bot);
        }
        return usable;
    }

    public onStateEntered(): void {
        this.activeState = this.enter;
        this.activeState.active = true;
        this.activeState.onStateEntered?.(...this.getUsableBots());
        // this.enterStates();

        this.emit("stateChanged");
    }

    public update(): void {
        this.activeState?.update?.();
        this.monitorAutonomous();

        for (let i = 0; i < this.transitions.length; i++) {
            const transition = this.transitions[i];
            if (transition.parentState === this.activeState) {
                if (transition.isTriggered() || transition.shouldTransition()) {
                    transition.resetTrigger();

                    this.activeState.active = false;
                    if (transition.parentState.autonomous && !transition.parentState.exitCase?.()) {
                        if (!this.backgroundStates.includes(this.activeState)) this.backgroundStates.push(this.activeState);
                    } else {
                        this.activeState.onStateExited?.();
                    }

                    transition.onTransition();
                    this.activeState = transition.childState;
                    this.activeState.active = true;

                    this.emit("stateChanged");

                    this.activeState.onStateEntered?.(...this.getUsableBots());

                    return;
                }
            }
        }
    }

    public monitorAutonomous(): void {
        for (const state of this.backgroundStates) {
            if (state.exitCase?.()) {
                for (const bot of this.bots) {
                    const index = this.activeBots[state.stateName].indexOf(bot);
                    if (index > -1) this.activeBots[state.stateName].splice(index, 1);
                    state.onStateExited?.();
                }
                const index = this.backgroundStates.indexOf(state);
                if (index > -1) this.backgroundStates.splice(index, 1);
            }
  
        }
    }

    public onStateExited(): void {
        if (this.activeState == null) return;
        this.activeState.active = false;
        // this.exitStates();
        this.activeState.onStateExited?.();
        this.activeState = undefined;
    }

    /**
     * Checks whether or not this state machine layer has finished running.
     */
    public isFinished(): boolean {
        if (this.active == null) return true;
        if (this.exit == null) return false;

        return this.activeState === this.exit;
    }

    public requestBots(amount: number = 1, exclusive: boolean = false): void {
        this.emit("requestBots", this, amount, exclusive);
    }
}