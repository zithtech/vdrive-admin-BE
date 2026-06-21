import { DriverTimeSlotsPricingRepository } from './driverTimeSlotsPricing.repository';
import { DriverTimeSlotsPricing } from './driverTimeSlotsPricing.model';

export const DriverTimeSlotsPricingService = {
  async getDriverTimeSlotsPricing(
    filters: {
      price_and_fare_rules_id?: string;
      driver_types?: string;
      day?: string;
    },
    page: number,
    limit: number
  ): Promise<{ data: DriverTimeSlotsPricing[]; total: number }> {
    return await DriverTimeSlotsPricingRepository.getDriverTimeSlotsPricing(filters, page, limit);
  },

  async getDriverTimeSlotsPricingById(id: string): Promise<DriverTimeSlotsPricing> {
    const timeSlot = await DriverTimeSlotsPricingRepository.getDriverTimeSlotsPricingById(id);
    if (!timeSlot) {
      throw { statusCode: 404, message: 'Driver time slots pricing not found' };
    }
    return timeSlot;
  },

  async getByPricingFareRuleId(price_and_fare_rules_id: string): Promise<DriverTimeSlotsPricing[]> {
    return await DriverTimeSlotsPricingRepository.getByPricingFareRuleId(price_and_fare_rules_id);
  },

  async createDriverTimeSlotsPricing(data: {
    price_and_fare_rules_id: string;
    driver_types: string;
    day: string;
    from_time: string;
    to_time: string;
    per_km_rate: number;
    per_hour_rate?: number;
  }): Promise<DriverTimeSlotsPricing> {
    // Validate rates
    if (data.per_km_rate < 0) {
      throw { statusCode: 400, message: 'Rate per km cannot be negative' };
    }
    if (data.per_hour_rate !== undefined && data.per_hour_rate < 0) {
      throw { statusCode: 400, message: 'Rate per hour cannot be negative' };
    }

    // Validate time range
    if (data.from_time >= data.to_time) {
      throw { statusCode: 400, message: 'From time must be before to time' };
    }

    // Check for time overlap
    const hasOverlap = await DriverTimeSlotsPricingRepository.checkTimeOverlap(
      data.price_and_fare_rules_id,
      data.driver_types,
      data.day,
      data.from_time,
      data.to_time
    );

    if (hasOverlap) {
      throw {
        statusCode: 409,
        message: 'Time slot overlaps with an existing slot for this driver type and day',
      };
    }

    return await DriverTimeSlotsPricingRepository.createDriverTimeSlotsPricing(data);
  },

  async bulkCreateDriverTimeSlotsPricing(
    slots: Array<{
      price_and_fare_rules_id: string;
      driver_types: string;
      day: string;
      from_time: string;
      to_time: string;
      per_km_rate: number;
      per_hour_rate?: number;
    }>
  ): Promise<DriverTimeSlotsPricing[]> {
    // Validate all slots before inserting
    for (const slot of slots) {
      if (slot.per_km_rate < 0) {
        throw { statusCode: 400, message: 'Rate per km cannot be negative' };
      }

      if (slot.from_time >= slot.to_time) {
        throw { statusCode: 400, message: 'From time must be before to time' };
      }
    }

    // Check for time overlaps
    for (const slot of slots) {
      const hasOverlap = await DriverTimeSlotsPricingRepository.checkTimeOverlap(
        slot.price_and_fare_rules_id,
        slot.driver_types,
        slot.day,
        slot.from_time,
        slot.to_time
      );

      if (hasOverlap) {
        throw {
          statusCode: 409,
          message: `Time slot overlaps with an existing slot for ${slot.driver_types} on ${slot.day}`,
        };
      }
    }

    // Check for overlaps within the bulk insert itself
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1 = slots[i];
        const slot2 = slots[j];

        // Check if same price_and_fare_rules_id, driver_types, and day
        if (
          slot1.price_and_fare_rules_id === slot2.price_and_fare_rules_id &&
          slot1.driver_types === slot2.driver_types &&
          slot1.day.toLowerCase() === slot2.day.toLowerCase()
        ) {
          // Check for time overlap
          const overlaps =
            (slot1.from_time <= slot2.from_time && slot1.to_time > slot2.from_time) ||
            (slot1.from_time < slot2.to_time && slot1.to_time >= slot2.to_time) ||
            (slot1.from_time >= slot2.from_time && slot1.to_time <= slot2.to_time);

          if (overlaps) {
            throw {
              statusCode: 409,
              message: `Time slots overlap within the bulk insert for ${slot1.driver_types} on ${slot1.day}`,
            };
          }
        }
      }
    }

    return await DriverTimeSlotsPricingRepository.bulkCreateDriverTimeSlotsPricing(slots);
  },

  async updateDriverTimeSlotsPricing(
    id: string,
    data: {
      driver_types?: string;
      day?: string;
      from_time?: string;
      to_time?: string;
      per_km_rate?: number;
      per_hour_rate?: number;
    }
  ): Promise<DriverTimeSlotsPricing> {
    // Check if time slot exists
    const existing = await DriverTimeSlotsPricingRepository.getDriverTimeSlotsPricingById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Driver time slots pricing not found' };
    }

    // Merge existing data with updates for validation
    const mergedData = { ...existing, ...data };

    // Validate rates if being updated
    if (data.per_km_rate !== undefined && data.per_km_rate < 0) {
      throw { statusCode: 400, message: 'Rate per km cannot be negative' };
    }
    if (data.per_hour_rate !== undefined && data.per_hour_rate < 0) {
      throw { statusCode: 400, message: 'Rate per hour cannot be negative' };
    }

    // Validate time range
    if (mergedData.from_time >= mergedData.to_time) {
      throw { statusCode: 400, message: 'From time must be before to time' };
    }

    // Check for time overlap (if time-related fields are being updated)
    if (
      data.driver_types !== undefined ||
      data.day !== undefined ||
      data.from_time !== undefined ||
      data.to_time !== undefined
    ) {
      const hasOverlap = await DriverTimeSlotsPricingRepository.checkTimeOverlap(
        existing.price_and_fare_rules_id,
        mergedData.driver_types,
        mergedData.day,
        mergedData.from_time,
        mergedData.to_time,
        id
      );

      if (hasOverlap) {
        throw {
          statusCode: 409,
          message: 'Updated time slot overlaps with an existing slot for this driver type and day',
        };
      }
    }

    return await DriverTimeSlotsPricingRepository.updateDriverTimeSlotsPricing(id, data);
  },

  async deleteDriverTimeSlotsPricing(id: string): Promise<void> {
    // Check if time slot exists
    const existing = await DriverTimeSlotsPricingRepository.getDriverTimeSlotsPricingById(id);
    if (!existing) {
      throw { statusCode: 404, message: 'Driver time slots pricing not found' };
    }

    await DriverTimeSlotsPricingRepository.deleteDriverTimeSlotsPricing(id);
  },

  async deleteByPricingFareRuleId(price_and_fare_rules_id: string): Promise<void> {
    await DriverTimeSlotsPricingRepository.deleteByPricingFareRuleId(price_and_fare_rules_id);
  },
};
