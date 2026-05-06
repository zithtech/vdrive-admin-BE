import { PriceRepository } from './price.repository';
import { PriceSetting, PriceSettingResponse } from './price.model';
import { logger } from '../../shared/logger';

export const PriceService = {
  async getPriceSettings(
    search: string,
    page: number,
    limit: number
  ): Promise<{ data: PriceSettingResponse[]; total: number }> {
    return await PriceRepository.getPriceSettings(search, page, limit);
  },

  async getPriceSettingById(location_id: string): Promise<PriceSettingResponse> {
    const priceSetting = await PriceRepository.getPriceSettingById(location_id);
    if (!priceSetting) {
      throw { statusCode: 404, message: 'Price setting not found' };
    }
    return priceSetting;
  },

  async createPriceSetting(data: PriceSetting): Promise<PriceSettingResponse> {
    // Validate required fields
    if (!data.location.country) {
      throw { statusCode: 400, message: 'Country is required' };
    }

    // Validate unique constraint (country, state, district, area combination)
    // This would typically be handled by database constraint, but we can add logic here if needed

    // Validate hotspot details if hotspot is enabled
    if (data.hotspotDetails.isHotspot) {
      if (!data.hotspotDetails.hotspotId) {
        throw { statusCode: 400, message: 'Hotspot ID is required when hotspot is enabled' };
      }
    }

    // Validate rate details
    if (!data.rateDetails || data.rateDetails.length === 0) {
      throw { statusCode: 400, message: 'At least one rate detail is required' };
    }

    // Validate each rate detail
    for (const rate of data.rateDetails) {
      if (!rate.driverType || !['normal', 'premium', 'elite'].includes(rate.driverType)) {
        throw { statusCode: 400, message: 'Invalid driver type' };
      }

      if (rate.cancellationFee < 0) {
        throw { statusCode: 400, message: 'Cancellation fee cannot be negative' };
      }

      if (!rate.waitingFee || rate.waitingFee.perMinutes <= 0) {
        throw { statusCode: 400, message: 'Waiting fee per minutes must be greater than 0' };
      }

      if (rate.waitingFee.fee <= 0) {
        throw { statusCode: 400, message: 'Waiting fee must be greater than 0' };
      }

      // Validate timing
      if (!rate.timing || rate.timing.length === 0) {
        throw { statusCode: 400, message: 'At least one timing is required for each rate' };
      }

      for (const timing of rate.timing) {
        if (!timing.day || !this.isValidDay(timing.day)) {
          throw { statusCode: 400, message: 'Invalid day of week' };
        }

        if (!timing.from || !timing.to) {
          throw { statusCode: 400, message: 'From and to times are required' };
        }

        if (!this.isValidHour(timing.from.time) || !this.isValidHour(timing.to.time)) {
          throw { statusCode: 400, message: 'Invalid hour (must be 1-12)' };
        }

        if (!['AM', 'PM'].includes(timing.from.type) || !['AM', 'PM'].includes(timing.to.type)) {
          throw { statusCode: 400, message: 'Invalid time type (must be AM or PM)' };
        }

        if (timing.rate <= 0) {
          throw { statusCode: 400, message: 'Rate must be greater than 0' };
        }
      }
    }

    return await PriceRepository.createPriceSetting(data);
  },

  async createMultiplePriceSettings(data: PriceSetting[]): Promise<PriceSettingResponse[]> {
    const results: PriceSettingResponse[] = [];

    // Process each price setting, continuing even if some fail
    for (let i = 0; i < data.length; i++) {
      try {
        const result = await this.createPriceSetting(data[i]);
        results.push(result);
      } catch (error) {
        // Log error and continue with next item
        logger.error(`Error creating price setting ${i}:`, error);
        // You might want to collect errors and return them
      }
    }

    if (results.length === 0) {
      throw { statusCode: 400, message: 'No price settings could be created successfully' };
    }

    return results;
  },

  async updatePriceSetting(
    id: string,
    updates: Partial<PriceSetting>
  ): Promise<PriceSettingResponse> {
    // Validate update data if provided
    if (updates.location?.country === '') {
      throw { statusCode: 400, message: 'Country cannot be empty' };
    }

    // Validate hotspot details if provided
    if (updates.hotspotDetails?.isHotspot && !updates.hotspotDetails.hotspotId) {
      throw { statusCode: 400, message: 'Hotspot ID is required when hotspot is enabled' };
    }

    // Validate each rate detail if provided
    if (updates.rateDetails) {
      for (const rate of updates.rateDetails) {
        if (!rate.driverType || !['normal', 'premium', 'elite'].includes(rate.driverType)) {
          throw { statusCode: 400, message: 'Invalid driver type' };
        }

        if (rate.cancellationFee < 0) {
          throw { statusCode: 400, message: 'Cancellation fee cannot be negative' };
        }

        if (!rate.waitingFee || rate.waitingFee.perMinutes <= 0) {
          throw { statusCode: 400, message: 'Waiting fee per minutes must be greater than 0' };
        }

        if (rate.waitingFee.fee <= 0) {
          throw { statusCode: 400, message: 'Waiting fee must be greater than 0' };
        }

        // Validate timing
        if (!rate.timing || rate.timing.length === 0) {
          throw { statusCode: 400, message: 'At least one timing is required for each rate' };
        }

        for (const timing of rate.timing) {
          if (!timing.day || !this.isValidDay(timing.day)) {
            throw { statusCode: 400, message: 'Invalid day of week' };
          }

          if (!timing.from || !timing.to) {
            throw { statusCode: 400, message: 'From and to times are required' };
          }

          if (!this.isValidHour(timing.from.time) || !this.isValidHour(timing.to.time)) {
            throw { statusCode: 400, message: 'Invalid hour (must be 1-12)' };
          }

          if (!['AM', 'PM'].includes(timing.from.type) || !['AM', 'PM'].includes(timing.to.type)) {
            throw { statusCode: 400, message: 'Invalid time type (must be AM or PM)' };
          }

          if (timing.rate <= 0) {
            throw { statusCode: 400, message: 'Rate must be greater than 0' };
          }
        }
      }
    }

    return await PriceRepository.updatePriceSetting(id, updates);
  },

  async deletePriceSetting(id: string): Promise<void> {
    return await PriceRepository.deletePriceSetting(id);
  },

  isValidDay(day: string): boolean {
    const validDays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    return validDays.includes(day);
  },

  isValidHour(hour: number): boolean {
    return hour >= 1 && hour <= 12;
  },
};
