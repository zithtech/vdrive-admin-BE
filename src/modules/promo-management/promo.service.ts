import { PromoRepository } from './promo.repository';
import { Promo } from './promo.model';

export const PromoService = {
  async getPromos(page: number, limit: number) {
    return await PromoRepository.getPromos(page, limit);
  },

  async getPromoById(id: number) {
    return await PromoRepository.getById(id);
  },

  async createPromo(data: Partial<Promo>) {
    return await PromoRepository.create(data);
  },

  async updatePromo(id: number, data: Partial<Promo>) {
    return await PromoRepository.update(id, data);
  },

  async togglePromoStatus(id: number, isActive: boolean) {
    return await PromoRepository.toggleStatus(id, isActive);
  },

  async deletePromo(id: number) {
    return await PromoRepository.delete(id);
  },

  async triggerNotification(id: number, target: string, driverId?: string) {
    return await PromoRepository.triggerNotification(id, target, driverId);
  }
};
