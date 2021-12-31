import { Bot } from 'mineflayer'
import { HiveBehavior } from '../HiveMindStates'

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle implements HiveBehavior {
  stateName: string = 'idle'
  active: boolean = false
  autonomous: boolean = false
  bots: Bot[] = []

  constructor() {

  }


  onStateEntered(...bots: Bot[]) {
      this.bots = bots
  }
}