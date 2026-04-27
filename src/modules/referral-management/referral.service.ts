import { ReferralRepository } from './referral.repository';

export const ReferralService = {
  async listConfigs() {
    return await ReferralRepository.getAll();
  },

  async createConfig(data: any) {
    if (data.is_active) {
      await ReferralRepository.deactivateAllOther(data.user_type);
    }
    return await ReferralRepository.create(data);
  },

  async updateConfig(id: string, data: any) {
    if (data.is_active) {
      const config = await ReferralRepository.getById(id);
      if (config) {
        await ReferralRepository.deactivateAllOther(config.user_type, id);
      }
    }
    return await ReferralRepository.update(id, data);
  },

  async deleteConfig(id: string) {
    return await ReferralRepository.delete(id);
  },

  async getActiveConfig(userType: string) {
    return await ReferralRepository.getByUserType(userType);
  },

  async listReferralLogs(userType: string) {
    return await ReferralRepository.getReferralLogs(userType as 'CUSTOMER' | 'DRIVER');
  }
};
