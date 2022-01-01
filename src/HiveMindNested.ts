import EventEmitter from "events";
import { Bot } from "mineflayer";
import { HiveBehavior, HiveTransition } from "./HiveMindStates";

export interface NestedHiveMindOptions {
    stateName: string;
    bots: Bot[];
    transitions: HiveTransition[];
    enter: typeof HiveBehavior;
    exit?: typeof HiveBehavior;
    autonomous: boolean;
    ignoreBusy: boolean;
}

export class NestedHiveMind extends EventEmitter implements NestedHiveMindOptions {
    readonly autonomous: boolean;
    readonly ignoreBusy: boolean;
    readonly stateName: string;
    readonly bots: Bot[];
    readonly runningStates: { [behaviorName: string]: HiveBehavior[] };
    readonly states: typeof HiveBehavior[];
    readonly transitions: HiveTransition[];
    activeStateType?: typeof HiveBehavior;
    readonly enter: typeof HiveBehavior;
    readonly exit?: typeof HiveBehavior;
    depth: number = 0;
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
        this.runningStates = {};
        this.states = this.findStates();
        this.recognizeStates();
    }

    private recognizeStates(): void {
        for (const state of this.states) {
            this.runningStates[state.name] ??= [];
        }
    }

    private findStates(): typeof HiveBehavior[] {
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
            const info = Object.entries(this.runningStates).find(([name, botList]) => botList.find((b) => b.bot === bot));
            if (this.ignoreBusy && info) continue;
            if (!this.ignoreBusy && info) {
                const state = this.runningStates[info[0]].find((stateType) => stateType.bot === bot)!;
                const staticRef = this.states.find(state => this.runningStates[info[0]][0] instanceof state)! //rough workaround. fix later.
                if (staticRef.autonomous) continue;
                this.removeState(info[0], state);
                state.active = false;
                state.onStateExited?.();
            }
            usable.push(bot);
        }
        return usable;
    }

    private removeState(stateName: string, state: HiveBehavior, index?: number) {
        index ??= this.runningStates[stateName].indexOf(state);
        if (index > -1) this.runningStates[stateName].splice(index, 1);
    }

    private pushState(stateName: string, state: HiveBehavior) {
        if (!this.runningStates[stateName].includes(state)) this.runningStates[stateName].push(state);
    }

    public onStateEntered(): void {
        this.activeStateType = this.enter;
        const bots = this.getUsableBots();
        this.enterStates(this.activeStateType, ...bots);
    }

    private setStatesInactive(stateType: typeof HiveBehavior) {
        for (const state of this.runningStates[stateType.name]) {
            state.active = false;
        }
    }

    private enterStates(enterState: typeof HiveBehavior, ...bots: Bot[]): void {
        for (const bot of bots) {
            const state = new enterState(bot);
            state.active = true;
            this.runningStates[enterState.name].push(state);
            state.onStateEntered?.();
        }
        this.emit("stateChanged");
    }

    private exitStates(exitState: typeof HiveBehavior): void {
        if (exitState.autonomous) return;
        const states = this.runningStates[exitState.name];
        for (const state of states) {
            state.active = false;
            state.onStateExited?.();
        }
        this.runningStates[exitState.name] = [];
        this.emit("stateChanged");
    }

    private updateStates(): void {
        if (!this.activeStateType) return;
        const states = this.runningStates[this.activeStateType.name];
        for (const state of states) {
            state.update?.();
        }
    }

    public update(): void {
        this.updateStates();
        this.monitorAutonomous();

        for (let i = 0; i < this.transitions.length; i++) {
            const transition = this.transitions[i];
            if (transition.parentState === this.activeStateType) {
                if (transition.isTriggered() || transition.shouldTransition()) {
                    transition.resetTrigger();
                    if (transition.parentState.autonomous) {
                        transition.onTransition();
                        this.activeStateType = transition.childState;
                    } else {
                        this.setStatesInactive(transition.parentState);
                        this.exitStates(transition.parentState);
                        transition.onTransition();
                        const bots = this.getUsableBots();
                        this.activeStateType = transition.childState;
                        this.enterStates(this.activeStateType, ...bots);
                    }
                    return;
                }
            }
        }
    }

    public monitorAutonomous(): void {
        for (const stateName in this.runningStates) {
            const staticRef = this.states.find(state => this.runningStates[stateName][0] instanceof state)! //rough workaround. fix later.
            for (const state of this.runningStates[stateName]) {
                if (staticRef.autonomous)
                    if (state.exitCase?.()) {
                        state.active = false;
                        state.onStateExited?.();
                        const index = this.runningStates[stateName].indexOf(state);
                        if (index > -1) {
                            const bot = this.runningStates[stateName][index].bot;
                            this.removeState(stateName, state, index);

                            if (this.activeStateType) {
                                const newState = new this.activeStateType(bot);
                                newState.active = true;
                                newState.onStateEntered?.();
                                this.pushState(this.activeStateType.name, newState);
                            }
                        }
                    }
            }
        }
    }

    public onStateExited(): void {
        if (this.activeStateType == null) return;
        this.exitStates(this.activeStateType);
        this.activeStateType = undefined;
    }

    /**
     * Checks whether or not this state machine layer has finished running.
     */
    public isFinished(): boolean {
        if (this.active == null) return true;
        if (this.exit == null) return false;

        return this.activeStateType === this.exit;
    }

    public requestBots(amount: number = 1, exclusive: boolean = false): void {
        this.emit("requestBots", this, amount, exclusive);
    }
}
