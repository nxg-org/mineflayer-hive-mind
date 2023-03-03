import { StateBehavior } from "..";

/**
 * The bot will look at the target entity.
 */
export class BehaviorLookAtEntity extends StateBehavior {
  static stateName: string = "lookAtEntity";
  active: boolean = false;

  update(): void {
    this.data.entity = this.bot.nearestEntity((e) => e.type === "player") ?? undefined;
    const entity = this.data.entity;
    if (entity) {
      this.bot.lookAt(entity.position.offset(0, entity.height, 0)).catch((err) => {
        console.log(err);
      });
    }
  }

  /**
   * Gets the distance to the target entity.
   *
   * @returns The distance, or 0 if no target entity is assigned.
   */
  distanceToTarget(): number {
    if (!this.data.entity) return 0;

    return this.bot.entity.position.distanceTo(this.data.entity.position);
  }
}
