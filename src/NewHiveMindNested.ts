import { Bot } from "mineflayer";
import { BehaviorIdle } from "./behaviors";
import { NestedHiveMindOptions } from "./HiveMindNested";
import { HiveBehavior, HiveTransition, StateMachineData } from "./HiveMindStates";

export interface NewHiveMindNestedOptions {
  stateName: string,
  transitions: HiveTransition[];
  enter: typeof HiveBehavior;
  exit?: typeof HiveBehavior;
  enterIntermediateStates?: boolean;
}

export class NewHiveMindNested extends HiveBehavior {
  public static readonly stateName: string;
  public static readonly transitions: HiveTransition[];
  public static readonly states: typeof HiveBehavior[];
  public static readonly enter: typeof HiveBehavior;
  public static readonly exit?: typeof HiveBehavior;
  public static readonly enterIntermediateStates: boolean = false;

  // not really needed, but helpful.
  staticRef: typeof NewHiveMindNested;
  activeStateType?: typeof HiveBehavior;
  activeState?: HiveBehavior;
  depth: number = 0;

  public constructor(bot: Bot, data: StateMachineData) {
    super(bot, data);
    this.staticRef = this.constructor as typeof NewHiveMindNested;
  }

  public get transitions(): HiveTransition[] {
    return (this.constructor as typeof NewHiveMindNested).transitions;
  }

  public onStateEntered(): void {
    this.activeStateType = this.staticRef.enter;
    this.enterState(this.activeStateType, this.bot);
  }

  private enterState(enterState: typeof HiveBehavior, bot: Bot): void {
    this.activeState = new enterState(bot, this.data);
    this.activeState.active = true;
    this.activeState.onStateEntered?.();
    this.emit("stateEntered", enterState, this.data);
  }

  private exitActiveState(): void {
    if (!this.activeState) return;
    this.activeState.active = false;
    this.activeState.onStateExited?.();
    this.emit("stateExited", this.activeState.constructor as typeof HiveBehavior, this.data);
  }

  public update(): void {
    this.activeState?.update?.();
    const lastState = this.activeStateType;
    const transitions = this.staticRef.transitions;
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i];
      if (transition.parentState === this.activeStateType) {
        if (transition.isTriggered() || transition.shouldTransition(this.data)) {
          transition.resetTrigger();
          i = -1; // reset to beginning of loop, incremental makes i = 0;
          this.exitActiveState();
          transition.onTransition(this.data);
          this.activeStateType = transition.childState;
          if (this.staticRef.enterIntermediateStates) this.enterState(this.activeStateType, this.bot);
        }
      }
    }

    if (this.activeStateType && this.activeStateType !== lastState) this.enterState(this.activeStateType, this.bot);
  }
}

export function createHiveMind({
  stateName,
  transitions,
  enter,
  exit,
  enterIntermediateStates = false,
}: NewHiveMindNestedOptions): typeof NewHiveMindNested {
  const states: typeof HiveBehavior[] = [];
  states.push(enter);

  if (!!exit) {
    if (!states.includes(exit)) {
      states.push(exit);
    }
  }

  for (let i = 0; i < transitions.length; i++) {
    const trans = transitions[i];
    if (!states.includes(trans.parentState)) {
      states.push(trans.parentState);
    }
    if (!states.includes(trans.childState)) {
      states.push(trans.childState);
    }
  }

  return class extends NewHiveMindNested {
    public static readonly stateName = stateName;
    public static readonly transitions = transitions;
    public static readonly states = states;
    public static readonly enter = enter;
    public static readonly exit? = exit;
    public static readonly enterIntermediateStates = enterIntermediateStates;
  };
}
