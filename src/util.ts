import { NestedStateMachine } from "./stateMachineNested";

export function isNestedStateMachine(first: Function["prototype"]): first is typeof NestedStateMachine {
  while (first && first !== Function.prototype) {
    if (first === NestedStateMachine) {
      return true;
    }
    first = Object.getPrototypeOf(first);
  }
  return false;
}
