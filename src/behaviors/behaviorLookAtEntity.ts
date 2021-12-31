import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { HiveBehavior } from "..";

/**
 * The bot will look at the target entity.
 */
export class BehaviorLookAtEntity extends HiveBehavior {
    static stateName: string = "lookAtEntity";
    active: boolean = false;
    target?: Entity;

    constructor(bot: Bot) {
        super(bot);
        this.target = this.bot.nearestEntity((e) => e.username === "Generel_Schwerz") ?? undefined;
    }

    update(): void {
        const entity = this.target;
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
        const entity = this.target
        if (entity == null) return 0;

        return this.bot.entity.position.distanceTo(entity.position);
    }
}
