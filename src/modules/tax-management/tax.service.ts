import { TaxRepository } from './tax.repository';

export const TaxService = {
  async getTaxes(page: number = 1, limit: number = 10) {
    return await TaxRepository.getTaxes(page, limit);
  },

  async getTaxById(id: string) {
    return await TaxRepository.getById(id);
  },

  async createTax(data: any) {
    return await TaxRepository.create(data);
  },

  async updateTax(id: string, data: any) {
    return await TaxRepository.update(id, data);
  },

  async toggleStatus(id: string, status: boolean) {
    return await TaxRepository.toggle(id, status);
  },

  async deleteTax(id: string) {
    return await TaxRepository.delete(id);
  },
};
