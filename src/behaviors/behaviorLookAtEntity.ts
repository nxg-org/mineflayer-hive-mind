import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { HiveBehavior } from "..";

/**
 * The bot will look at the target entity.
 */
export class BehaviorLookAtEntity extends HiveBehavior {
    static stateName: string = "lookAtEntity";
    active: boolean = false;
    data?: Entity;

    constructor(bot: Bot) {
        super(bot);
        this.data = this.bot.nearestEntity((e) => e.type === "player") ?? undefined;
    }

    update(): void {
        const entity = this.data;
        if (entity != null) {
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
        const entity = this.data
        if (entity == null) return 0;

        return this.bot.entity.position.distanceTo(entity.position);
    }
}
