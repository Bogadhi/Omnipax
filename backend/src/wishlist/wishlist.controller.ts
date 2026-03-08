import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post(':eventId')
  addToWishlist(@Request() req: any, @Param('eventId') eventId: string) {
    return this.wishlistService.addToWishlist(req.user.id, eventId);
  }

  @Delete(':eventId')
  removeFromWishlist(@Request() req: any, @Param('eventId') eventId: string) {
    return this.wishlistService.removeFromWishlist(req.user.id, eventId);
  }

  @Get('my')
  getUserWishlist(@Request() req: any) {
    return this.wishlistService.getUserWishlist(req.user.id);
  }
}
