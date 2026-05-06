import { CouponRepository } from './coupon.repository';
import { Coupon, CouponUsage } from './coupon.model';

export const CouponService = {
  async getCoupons(page: number, limit: number) {
    return CouponRepository.getCoupons(page, limit);
  },

  async getCouponById(id: string) {
    return CouponRepository.getById(id);
  },

  async createCoupon(data: Coupon) {
    // Check if code already exists
    const existing = await CouponRepository.getByCode(data.code);
    if (existing) {
      throw new Error('Coupon code already exists');
    }
    const coupon = await CouponRepository.create(data);

    // Create a topic: coupon_<COUPON_CODE>
    const topicName = `coupon_${coupon.code}`;
    await CouponRepository.createTopic(coupon.id, topicName);

    return coupon;
  },

  async updateCoupon(id: string, data: Partial<Coupon>) {
    return CouponRepository.update(id, data);
  },

  async toggleCouponStatus(id: string, is_active: boolean) {
    return CouponRepository.toggleStatus(id, is_active);
  },

  async deleteCoupon(id: string) {
    return CouponRepository.delete(id);
  },

  async validateAndApplyCoupon(code: string, userId: string, tripAmount: number) {
    const coupon = await CouponRepository.getByCode(code);
    if (!coupon) {
      throw new Error('Invalid coupon code');
    }

    if (!coupon.is_active) {
      throw new Error('Coupon is no longer active');
    }

    const now = new Date();
    if (now < new Date(coupon.valid_from) || now > new Date(coupon.valid_until)) {
      throw new Error('Coupon is expired or not yet valid');
    }

    if (tripAmount < Number(coupon.min_ride_amount)) {
      throw new Error(`Minimum ride amount of ${coupon.min_ride_amount} required`);
    }

    // Check usage limits
    if (coupon.usage_limit) {
      const totalUses = await CouponRepository.getTotalUsageCount(coupon.id);
      if (totalUses >= coupon.usage_limit) {
        throw new Error('Coupon has reached its maximum usage limit');
      }
    }

    if (coupon.per_user_limit) {
      const userUses = await CouponRepository.getUserUsageCount(coupon.id, userId);
      if (userUses >= coupon.per_user_limit) {
        throw new Error('You have reached the maximum usage limit for this coupon');
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discount = (tripAmount * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount_amount && discount > Number(coupon.max_discount_amount)) {
        discount = Number(coupon.max_discount_amount);
      }
    } else if (coupon.discount_type === 'FIXED') {
      discount = Number(coupon.discount_value);
    } else if (coupon.discount_type === 'FREE_RIDE') {
      discount = tripAmount; // Or bounded by max_discount_amount
      if (coupon.max_discount_amount && discount > Number(coupon.max_discount_amount)) {
        discount = Number(coupon.max_discount_amount);
      }
    }

    // Don't let discount exceed amount
    if (discount > tripAmount) {
      discount = tripAmount;
    }

    return {
      coupon_id: coupon.id,
      discount_amount: discount,
      final_amount: tripAmount - discount
    };
  },

  async recordCouponUsage(usageData: CouponUsage) {
    return CouponRepository.recordUsage(usageData);
  },

  async notifyUsers(couponId: string, target: string, userId?: string) {
    return CouponRepository.triggerNotification(couponId, target, userId);
  }
};
