import EventEmitter from "events";
import { Bot } from "mineflayer";
import { StrictEventEmitter } from "strict-event-emitter-types";
import { StateBehavior, StateTransition, StateMachineData } from "./stateBehavior";
import { isNestedStateMachine } from "./util";

export interface NestedStateMachineOptions {
  stateName: string;
  transitions: StateTransition<any>[];
  enter: typeof StateBehavior;
  exit?: typeof StateBehavior;
  enterIntermediateStates?: boolean;
}

type StateBehaviorBuilder = typeof StateBehavior &
  (new (bot: Bot, data: StateMachineData, ...additonal: any[]) => StateBehavior);

export interface StateBehaviorEvent {
  stateEntered: (cls: NestedStateMachine, newBehavior: typeof StateBehavior, data: StateMachineData) => void;
  stateExited: (cls: NestedStateMachine, oldBehavior: typeof StateBehavior, data: StateMachineData) => void;
}

export class NestedStateMachine
  extends (EventEmitter as { new (): StrictEventEmitter<EventEmitter, StateBehaviorEvent> })
  implements StateBehavior
{
  public static readonly stateName: string = this.name;
  public static readonly transitions: StateTransition[];
  public static readonly states: typeof StateBehavior[];
  public static readonly enter: typeof StateBehavior;
  public static readonly exit?: typeof StateBehavior;
  public static readonly enterIntermediateStates: boolean;

  // not correct but whatever.
  public static readonly onStartupListeners: [
    key: keyof StateBehaviorEvent,
    listener: StateBehaviorEvent[keyof StateBehaviorEvent]
  ][];

  // not really needed, but helpful.
  staticRef: typeof NestedStateMachine;
  activeStateType?: typeof StateBehavior;
  activeState?: StateBehavior;

  public readonly bot: Bot;
  public readonly data: StateMachineData;
  public active: boolean = false;

  public constructor(bot: Bot, data: StateMachineData = {}) {
    super();
    this.bot = bot;
    this.data = data;
    this.staticRef = this.constructor as typeof NestedStateMachine;
    for (const listener of this.staticRef.onStartupListeners) {
      this.on(listener[0], listener[1]);
    }
  }

  static addEventualListener<Key extends keyof StateBehaviorEvent>(key: Key, listener: StateBehaviorEvent[Key]) {
    if ((this as typeof NestedStateMachine).onStartupListeners.find((l) => l[0] === key)) return;
    (this as typeof NestedStateMachine).onStartupListeners.push([key, listener]);
    // console.log((this as typeof NestedStateMachine).onStartupListeners)
  }

  /**
   * Getter
   */
  public get transitions(): StateTransition[] {
    return (this.constructor as typeof NestedStateMachine).transitions;
  }

  /**
   * Getter
   */
  public get states(): typeof StateBehavior[] {
    return (this.constructor as typeof NestedStateMachine).states;
  }

  /**
   * Getter
   */
  public get stateName(): string {
    return (this.constructor as typeof NestedStateMachine).stateName;
  }

  public onStateEntered(): void {
    this.activeStateType = this.staticRef.enter;
    this.enterState(this.activeStateType, this.bot);
  }

  private enterState(enterState: StateBehaviorBuilder, bot: Bot, ...additional: any[]): void {
    if (isNestedStateMachine(enterState)) {
      for (const [key, func] of this.staticRef.onStartupListeners) {
        if (!enterState.onStartupListeners.find((l) => l[0] === key)) enterState.addEventualListener(key, func);
      }
      // console.log("entering", enterState, ", and it IS a state machine")
    } else {
      // console.log("entering", enterState, ", and it is NOT a state machine")
    }

    this.activeState = new enterState(bot, this.data, ...additional);
    this.activeState.active = true;
    this.activeState.onStateEntered?.();
    this.emit("stateEntered", this, enterState, this.data);
  }

  private exitActiveState(): void {
    if (!this.activeState) return;
    this.activeState.active = false;
    this.activeState.onStateExited?.();
    this.emit("stateExited", this, this.activeState.constructor as typeof StateBehavior, this.data);
  }

  public update(): void {
    this.activeState?.update?.();
    const lastState = this.activeStateType;
    const transitions = this.staticRef.transitions;
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i];
      if (transition.parentState === this.activeStateType) {
        if (transition.isTriggered() || transition.shouldTransition(this.data, this.activeState!)) {
          transition.resetTrigger();
          i = -1;
          transition.onTransition(this.data, this.activeState!);
          this.exitActiveState();
          this.activeStateType = transition.childState;
          if (this.staticRef.enterIntermediateStates) this.enterState(this.activeStateType, this.bot, transition.additionalArguments);
        }
      }
    }

    if (this.activeStateType && this.activeStateType !== lastState) this.enterState(this.activeStateType, this.bot);
  }

  /**
   * Checks whether or not this state machine layer has finished running.
   */
  isFinished(): boolean {
    if (this.active == null) return true;
    if (!this.staticRef.exit) return false;
    return this.activeStateType === this.staticRef.exit;
  }
}

/**
 * Creates a new Nested
 * @param param0
 * @returns
 */
export function newNestedStateMachine({
  stateName,
  transitions,
  enter,
  exit,
  enterIntermediateStates = true,
}: NestedStateMachineOptions): typeof NestedStateMachine {
  const states: typeof StateBehavior[] = [];
 
  if (!states.includes(enter)) states.push(enter);

  if (!!exit && !states.includes(exit)) states.push(exit);


  for (let i = 0; i < transitions.length; i++) {
    const trans = transitions[i];
    if (!states.includes(trans.parentState)) states.push(trans.parentState);
    if (!states.includes(trans.childState)) states.push(trans.childState);
  }


  console.log("building machine:", stateName, states)
  return class extends NestedStateMachine {
    public static readonly stateName = stateName;
    public static readonly transitions = transitions;
    public static readonly states = states;
    public static readonly enter = enter;
    public static readonly exit? = exit;
    public static readonly enterIntermediateStates = enterIntermediateStates;
    public static readonly onStartupListeners = [];
  };
}
