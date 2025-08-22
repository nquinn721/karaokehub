import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { FavoriteController } from '../favorite/favorite.controller';
import { FavoriteShow } from '../favorite/favorite.entity';
import { FavoriteService } from '../favorite/favorite.service';
import { ShowController } from '../show/show.controller';
import { Show } from '../show/show.entity';
import { ShowService } from '../show/show.service';
import { UserController } from '../user/user.controller';
import { UserService } from '../user/user.service';
import { VendorController } from '../vendor/vendor.controller';
import { Vendor } from '../vendor/vendor.entity';
import { VendorService } from '../vendor/vendor.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Vendor, Show, FavoriteShow])],
  providers: [UserService, VendorService, ShowService, FavoriteService],
  controllers: [UserController, VendorController, ShowController, FavoriteController],
  exports: [UserService, VendorService, ShowService, FavoriteService],
})
export class DatabaseModule {}
