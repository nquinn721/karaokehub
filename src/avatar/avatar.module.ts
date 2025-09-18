import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Microphone } from './entities/microphone.entity';
import { Outfit } from './entities/outfit.entity';
import { Shoes } from './entities/shoes.entity';
import { UserAvatar } from './entities/user-avatar.entity';
import { UserMicrophone } from './entities/user-microphone.entity';
import { UserOutfit } from './entities/user-outfit.entity';
import { UserShoes } from './entities/user-shoes.entity';

// Services
import { AvatarService } from './services/avatar.service';
import { MicrophoneService } from './services/microphone.service';
import { OutfitService } from './services/outfit.service';
import { ShoesService } from './services/shoes.service';

// Controllers
import { AvatarController } from './controllers/avatar.controller';
import { MicrophoneController } from './controllers/microphone.controller';
import { OutfitController } from './controllers/outfit.controller';
import { ShoesController } from './controllers/shoes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAvatar,
      Microphone,
      Outfit,
      Shoes,
      UserMicrophone,
      UserOutfit,
      UserShoes,
    ]),
  ],
  controllers: [AvatarController, MicrophoneController, OutfitController, ShoesController],
  providers: [AvatarService, MicrophoneService, OutfitService, ShoesService],
  exports: [AvatarService, MicrophoneService, OutfitService, ShoesService],
})
export class AvatarModule {}
