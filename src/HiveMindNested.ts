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
    readonly states: (typeof HiveBehavior)[];
    readonly transitions: HiveTransition[];
    readonly bgTransitions: HiveTransition[];
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
        this.bgTransitions = [];
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
            const info = Object.entries(this.runningStates).find(([name, botList]) => botList.map(state => state.bot).includes(bot));
            if (this.ignoreBusy && info) continue;
            if (!this.ignoreBusy && info) this.runningStates[info[0]].splice(info[1].map(state => state.bot).indexOf(bot), 1);
            usable.push(bot);
        }
        return usable;
    }

    public onStateEntered(): void {
        this.activeStateType = this.enter;
        const bots = this.getUsableBots();
        this.enterStates(this.activeStateType, ...bots);

    }

    private getAllStates(stateType: typeof HiveBehavior) {
        return this.runningStates[stateType.name]
    }


    private setStatesInactive(stateType: typeof HiveBehavior) {
        for (const state of this.getAllStates(stateType)){
            state.active = false;
        }
    }

    private enterStates(enterState: typeof HiveBehavior, ...bots: Bot[]): void {
        for (const bot of bots) {
            const state = new enterState(bot)
            state.active = true;
            this.runningStates[enterState.name].push(state)
            state.onStateEntered?.();
        }
        this.emit("stateChanged");
    }

    private exitStates(exitState: typeof HiveBehavior): void {
        if (exitState.prototype.autonomous) return;
        const states = this.runningStates[exitState.name]
        for (const state of states) {
            state.active = false
            state.onStateExited?.();
        }
        this.runningStates[exitState.name] = [];
        this.emit("stateChanged");
    }

    private updateStates(): void {
        if (!this.activeStateType) return;
        const states = this.runningStates[this.activeStateType.name]
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
                    if (transition.parentState.prototype.autonomous) {
                        if (!this.bgTransitions.includes(transition)) {
                            this.bgTransitions.push(transition);
                            transition.onTransition();
                            this.activeStateType = transition.childState;
                            return;
                        }
                    } else {
                        this.setStatesInactive(this.activeStateType)
                        this.exitStates(this.activeStateType);
                        transition.onTransition();
                        const bots = this.getUsableBots();
                        this.activeStateType = transition.childState;
                        this.enterStates(this.activeStateType, ...bots)
                    }


                   
                    return;
                }
            }
        }
    }


    public monitorAutonomous(): void {
        for (const transit of this.bgTransitions) {
            for (const state of this.runningStates[transit.parentState.name]) {
                if (state.exitCase?.()) {
                    state.active = false;
                    state.onStateExited?.();
                    const index = this.runningStates[transit.parentState.name].indexOf(state);
                    if (index > -1) {
                        const bot = this.runningStates[transit.parentState.name][index].bot
                        this.runningStates[transit.parentState.name].splice(index, 1);
                        const newState = new transit.childState(bot);
                        newState.active = true;
                        newState.onStateEntered?.();
                        this.runningStates[transit.childState.name].push(newState)
                    }
                    const indexOne = this.bgTransitions.indexOf(transit);
                    if (indexOne > -1) this.bgTransitions.splice(index, 1);    
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
