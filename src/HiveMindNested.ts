import { EventEmitter } from "events";
import type { Bot } from "mineflayer";

import { StrictEventEmitter } from "strict-event-emitter-types";
import { HiveBehavior, HiveTransition, StateMachineData } from "./HiveMindStates";

export interface NestedHiveMindOptions {
  stateName: string;
  bot: Bot;
  transitions: HiveTransition[];
  enter: typeof HiveBehavior;
  exit?: typeof HiveBehavior;
  data?: StateMachineData;
  autonomous: boolean;
  ignoreBusy: boolean;
  enterIntermediateStates?: boolean;
}



export class NestedHiveMind
  extends HiveBehavior
  implements NestedHiveMindOptions
{
  readonly stateName: string = this.constructor.name;
  readonly autonomous: boolean;
  readonly ignoreBusy: boolean;
  readonly runningStates: { [className: string]: HiveBehavior[] };
  readonly states: typeof HiveBehavior[];
  readonly transitions: HiveTransition[];
  readonly enter: typeof HiveBehavior;
  readonly exit?: typeof HiveBehavior;
  readonly enterIntermediateStates: boolean;
  data: StateMachineData;
  activeStateType?: typeof HiveBehavior;
  depth: number = 0;
  active: boolean = false;

  constructor({
    stateName,
    bot,
    transitions,
    enter,
    exit = undefined,
    data = {},
    autonomous = false,
    ignoreBusy = false,
    enterIntermediateStates = false,
  }: NestedHiveMindOptions) {
    super(bot, data);
    this.stateName = stateName;
    this.autonomous = autonomous;
    this.ignoreBusy = ignoreBusy;
    this.transitions = transitions;
    this.enter = enter;
    this.exit = exit;
    this.data = data;
    this.enterIntermediateStates = enterIntermediateStates;
    this.runningStates = {};
    this.states = this.findStates();
    this.recognizeStates();
  }

  private recognizeStates(): void {
    for (const state of this.states) {
      this.runningStates[state.name] ||= [];
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


  private removeState(stateName: string, state: HiveBehavior, index?: number) {
    index ??= this.runningStates[stateName].indexOf(state);
    if (index > -1) this.runningStates[stateName].splice(index, 1);
  }

  private pushState(stateName: string, state: HiveBehavior) {
    if (!this.runningStates[stateName].includes(state)) this.runningStates[stateName].push(state);
  }

  public onStateEntered(): void {
    this.activeStateType = this.enter;
    this.enterStates(this.activeStateType, this.bot);
  }

  private enterStates(enterState: typeof HiveBehavior, ...bots: Bot[]): void {
    for (const bot of bots) {
      const state = new enterState(bot, this.data);
      state.active = true;
      this.runningStates[enterState.name].push(state);
      state.onStateEntered?.();
    }
    this.emit("stateEntered", enterState, this.data);
  }

  private exitStates(exitState: typeof HiveBehavior): void {
    if (exitState.autonomous) return;
    const states = this.runningStates[exitState.name];
    for (const state of states) {
      state.active = false;
      state.onStateExited?.();
    }
    this.runningStates[exitState.name] = [];
    this.emit("stateExited", exitState, this.data);
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
    const lastState = this.activeStateType;
    for (let i = 0; i < this.transitions.length; i++) {
      const transition = this.transitions[i];
      if (transition.parentState === this.activeStateType) {
        if (transition.isTriggered() || transition.shouldTransition(this.data)) {
          transition.resetTrigger();
          i = -1; // reset to beginning of loop, incremental makes i = 0;
          if (transition.parentState.autonomous) {
            transition.onTransition(this.data);
            this.activeStateType = transition.childState;
          } else {
            this.exitStates(transition.parentState);
            transition.onTransition(this.data);
            this.activeStateType = transition.childState;
            if (this.enterIntermediateStates) this.enterStates(this.activeStateType, this.bot);
          }
        }
      }
    }

    if (this.activeStateType && this.activeStateType !== lastState) this.enterStates(this.activeStateType, this.bot);
  }

  public monitorAutonomous(): void {
    for (const stateName in this.runningStates) {
      for (const state of this.runningStates[stateName]) {
        if ((state.constructor as typeof HiveBehavior).autonomous) {
          if (state.exitCase?.()) {
            state.active = false;
            state.onStateExited?.();
            const index = this.runningStates[stateName].indexOf(state);
            if (index > -1) {
              const bot = this.runningStates[stateName][index].bot;
              this.removeState(stateName, state, index);

              if (this.activeStateType) {
                const newState = new this.activeStateType(bot, this.data);
                newState.active = true;
                newState.onStateEntered?.();
                this.pushState(this.activeStateType.name, newState);
              }
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
    if (!this.active) return true;
    if (!this.exit) return false;

    return this.activeStateType === this.exit;
  }
}
