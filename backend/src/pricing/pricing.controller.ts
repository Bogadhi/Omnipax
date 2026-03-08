import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { PricingService } from './pricing.service';

import { UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('pricing')
@UseInterceptors(CacheInterceptor)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get(':showId')
  @CacheTTL(60)
  async getShowPricing(@Param('showId') showId: string) {
    return this.pricingService.getDynamicPrices(showId);
  }

  @Get(':showId/calculate')
  async calculatePricing(
    @Param('showId') showId: string,
    @Query('qty', ParseIntPipe) qty: number,
    @Query('price') price?: string, // Optional override if frontend already has show base price
  ) {
    // If price is passed as a query, use it, otherwise fetch from DB
    let basePrice = price ? parseFloat(price) : 0;
    
    if (!basePrice) {
      const dynamic = await this.pricingService.getDynamicPrices(showId);
      basePrice = dynamic.finalPrice;
    }

    return this.pricingService.calculateTotal(basePrice, qty);
  }
}
