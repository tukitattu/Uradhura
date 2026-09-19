// ============================================================
// DRIVER REGISTRY — resolves the correct GameDriver per code
// ============================================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { GameDriver } from './game-driver.interface';
import { WheelDriver } from './wheel.driver';
import { TeenPattiDriver } from './teen-patti.driver';
import { ThreeCardDriver } from './three-card.driver';
import { SlotDriver } from './slot.driver';

@Injectable()
export class GameDriverRegistry {
  private readonly drivers: Map<string, GameDriver> = new Map();

  constructor() {
    // Three wheel games share the wheel driver logic but keep distinct codes.
    const wheelDrivers = [
      new WheelDriver('greedy_monkey'),
      new WheelDriver('greedy_lion'),
      new WheelDriver('food_wheel'),
    ];
    for (const driver of [...wheelDrivers, new TeenPattiDriver(), new ThreeCardDriver(), new SlotDriver()]) {
      this.drivers.set(driver.code, driver);
    }
  }

  resolve(gameCode: string): GameDriver {
    const driver = this.drivers.get(gameCode);
    if (!driver) {
      throw new BadRequestException(`No game driver registered for code: ${gameCode}`);
    }
    return driver;
  }

  has(gameCode: string): boolean {
    return this.drivers.has(gameCode);
  }

  codes(): string[] {
    return [...this.drivers.keys()];
  }
}