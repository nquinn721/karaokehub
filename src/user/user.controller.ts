import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateUserDto, UpdateUserDto, UserService } from './user.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/admin')
  @UseGuards(AdminGuard)
  updateAdminStatus(@Param('id') id: string, @Body() body: { isAdmin: boolean }) {
    return this.userService.updateAdminStatus(id, body.isAdmin);
  }

  @Patch(':id/avatar')
  updateAvatar(@Param('id') id: string, @Body() body: { avatarId: string }) {
    return this.userService.updateAvatar(id, body.avatarId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
