import { Bot } from 'mineflayer'
import { HiveBehavior } from '../HiveMindStates'

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle extends HiveBehavior {
  static stateName: string = 'idle'

  bots: Bot[] = []

  constructor(bot: Bot) {
    super(bot)
  }
}