import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteController } from '../favorite/favorite.controller';
import { Favorite } from '../favorite/favorite.entity';
import { FavoriteService } from '../favorite/favorite.service';
import { KJController } from '../kj/kj.controller';
import { KJ } from '../kj/kj.entity';
import { KJService } from '../kj/kj.service';
import { ShowController } from '../show/show.controller';
import { Show } from '../show/show.entity';
import { ShowService } from '../show/show.service';
import { UserController } from '../user/user.controller';
import { User } from '../entities/user.entity';
import { UserService } from '../user/user.service';
import { VendorController } from '../vendor/vendor.controller';
import { Vendor } from '../vendor/vendor.entity';
import { VendorService } from '../vendor/vendor.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Vendor, KJ, Show, Favorite])],
  providers: [UserService, VendorService, KJService, ShowService, FavoriteService],
  controllers: [UserController, VendorController, KJController, ShowController, FavoriteController],
  exports: [UserService, VendorService, KJService, ShowService, FavoriteService],
})
export class DatabaseModule {}
