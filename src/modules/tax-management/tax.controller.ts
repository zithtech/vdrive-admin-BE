import { Request, Response, NextFunction } from 'express';
import { TaxService } from './tax.service';

export const TaxController = {
  async getTaxes(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const { taxes, total } = await TaxService.getTaxes(page, limit);
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        message: 'Taxes fetched successfully',
        data: taxes,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getTaxById(req: Request, res: Response, next: NextFunction) {
    try {
      const tax = await TaxService.getTaxById(req.params.id);
      if (!tax) {
        return res.status(404).json({ message: 'Tax not found' });
      }
      return res.status(200).json({
        message: 'Tax fetched successfully',
        data: tax,
      });
    } catch (err) {
      next(err);
    }
  },

  async createTax(req: Request, res: Response, next: NextFunction) {
    try {
      const tax = await TaxService.createTax(req.body);
      return res.status(201).json({
        message: 'Tax created successfully',
        data: tax,
      });
    } catch (err) {
      next(err);
    }
  },

  async editTax(req: Request, res: Response, next: NextFunction) {
    try {
      const tax = await TaxService.updateTax(req.params.id, req.body);
      if (!tax) {
        return res.status(404).json({ message: 'Tax not found' });
      }
      return res.status(200).json({
        message: 'Tax updated successfully',
        data: tax,
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleTaxStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { is_active } = req.body;
      const tax = await TaxService.toggleStatus(req.params.id, is_active);
      if (!tax) {
        return res.status(404).json({ message: 'Tax not found' });
      }
      return res.status(200).json({
        message: 'Tax status updated successfully',
        data: tax,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteTax(req: Request, res: Response, next: NextFunction) {
    try {
      await TaxService.deleteTax(req.params.id);
      return res.status(200).json({
        message: 'Tax deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
