import type { Entity } from "prismarine-entity";
import { Movements, goals } from "mineflayer-pathfinder";
import { StateBehavior } from "../StateBehavior";

/**
 * Causes the bot to follow the target entity.
 *
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorFollowEntity extends StateBehavior {
  static stateName: string = "followEntity";
  static autonomous: boolean = true;
  movements?: Movements;
  followDistance: number = 0;

  onStateEntered = () => {

    if (!this.bot.pathfinder) throw "Pathfinder is not loaded!";

    const mcData = this.bot.registry;
    this.movements = new Movements(this.bot, mcData);
    this.data.entity = this.bot.nearestEntity((e) => e.type === "player") ?? undefined;
    this.startMoving(this.data.entity);
  };

  onStateExited(): void {
    this.stopMoving();
    this.data.entity = undefined;
  }

  exitCase(): boolean {
    const distances = this.distanceToTarget();
    return distances < 3;
  }

  setFollowTarget(entity: Entity): void {
    if (this.data === entity) {
      return;
    }

    this.data.entity = entity;
    this.restart();
  }

  private stopMoving(): void {
    this.bot.pathfinder.setGoal(null);
  }

  private startMoving(entity?: Entity): void {
    if (!entity) return;
    if (entity === this.data.entity && this.bot.pathfinder.isMoving()) return;
    const pathfinder = this.bot.pathfinder;
    const goal = new goals.GoalFollow(entity, this.followDistance);
    if (this.movements) pathfinder.setMovements(this.movements);
    pathfinder.setGoal(goal, true);
  }

  restart(): void {
    if (!this.active) {
      return;
    }

    this.stopMoving();
    this.startMoving(this.data.entity);
  }

  distanceToTarget(): number {
    if (!this.data.entity) return 0;
    return this.bot.entity.position.distanceTo(this.data.entity.position);
  }
}
