import { Bot } from "mineflayer";
import { StateBehavior, StateTransition, StateMachineData } from "./StateBehavior";

export interface NestedHiveMindOptions {
  stateName: string;
  transitions: StateTransition[];
  enter: typeof StateBehavior;
  exit?: typeof StateBehavior;
  enterIntermediateStates?: boolean;
}

type HiveBehaviorBuilder = new (bot: Bot, data: StateMachineData, ...additonal: any[]) => StateBehavior;

export class NestedHiveMind extends StateBehavior {
  public static readonly stateName: string;
  public static readonly transitions: StateTransition[];
  public static readonly states: typeof StateBehavior[];
  public static readonly enter: typeof StateBehavior;
  public static readonly exit?: typeof StateBehavior;
  public static readonly enterIntermediateStates: boolean = false;

  // not really needed, but helpful.
  staticRef: typeof NestedHiveMind;
  activeStateType?: typeof StateBehavior;
  activeState?: StateBehavior;
  depth: number = 0;

  public constructor(bot: Bot, data: StateMachineData) {
    super(bot, data);
    this.staticRef = this.constructor as typeof NestedHiveMind;
  }

  /**
   * Getter
   */
  public get transitions(): StateTransition[] {
    return (this.constructor as typeof NestedHiveMind).transitions;
  }

  /**
   * Getter
   */
  public get states(): typeof StateBehavior[] {
    return (this.constructor as typeof NestedHiveMind).states;
  }

  /**
   * Getter
   */
  public get stateName(): string {
    return (this.constructor as typeof NestedHiveMind).stateName;
  }

  public onStateEntered(): void {
    this.activeStateType = this.staticRef.enter;
    this.enterState(this.activeStateType, this.bot);
  }

  private enterState(enterState: HiveBehaviorBuilder, bot: Bot, ...additional: any[]): void {
    this.activeState = new enterState(bot, this.data, ...additional);
    this.activeState.active = true;
    this.activeState.onStateEntered?.();
    this.emit("stateEntered", enterState, this.data);
  }

  private exitActiveState(): void {
    if (!this.activeState) return;
    this.activeState.active = false;
    this.activeState.onStateExited?.();
    this.emit("stateExited", this.activeState.constructor as typeof StateBehavior, this.data);
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
          i = -1;
          this.exitActiveState();
          transition.onTransition(this.data);
          this.activeStateType = transition.childState;
          if (this.staticRef.enterIntermediateStates)
            this.enterState(this.activeStateType, this.bot, transition.additionalArguments);
        }
      }
    }

    if (this.activeStateType && this.activeStateType !== lastState) this.enterState(this.activeStateType, this.bot);
  }
}

export function newNestedHiveMind({
  stateName,
  transitions,
  enter,
  exit,
  enterIntermediateStates = false,
}: NestedHiveMindOptions): typeof NestedHiveMind {
  const states: typeof StateBehavior[] = [];

  states.push(enter);

  if (!!exit && !states.includes(exit)) states.push(exit);

  for (let i = 0; i < transitions.length; i++) {
    const trans = transitions[i];
    if (!states.includes(trans.parentState)) states.push(trans.parentState);
    if (!states.includes(trans.childState)) states.push(trans.childState);
  }

  return class extends NestedHiveMind {
    public static readonly stateName = stateName;
    public static readonly transitions = transitions;
    public static readonly states = states;
    public static readonly enter = enter;
    public static readonly exit? = exit;
    public static readonly enterIntermediateStates = enterIntermediateStates;
  };
}
