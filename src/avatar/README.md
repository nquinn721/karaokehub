# Avatar System

A comprehensive avatar customization system for KaraokeHub that allows users to personalize their avatars with different items including microphones, outfits, and shoes.

## Features

- **User Avatars**: Each user can have one active avatar with customizable items
- **Inventory System**: Users can own multiple items and equip/unequip them
- **Item Categories**:
  - Microphones (Basic, Vintage, Modern, Wireless, Premium, Golden)
  - Outfits (Casual, Formal, Stage, Vintage, Modern, Themed, Seasonal)
  - Shoes (Sneakers, Dress, Boots, Sandals, Heels, Athletic, Vintage, Stage)
- **Rarity System**: Common, Uncommon, Rare, Epic, Legendary
- **Unlockable Items**: Special items that can be unlocked through achievements
- **Pricing System**: Items can be purchased or unlocked through gameplay

## Entities

### Core Entities

- `UserAvatar`: Represents a user's current avatar configuration
- `Microphone`: Available microphone items
- `Outfit`: Available outfit items
- `Shoes`: Available shoe items

### Inventory Entities

- `UserMicrophone`: Tracks microphones owned by users
- `UserOutfit`: Tracks outfits owned by users
- `UserShoes`: Tracks shoes owned by users

## API Endpoints

### Avatar Management

- `GET /avatar/my-avatar` - Get current user's avatar
- `PUT /avatar/my-avatar` - Update current user's avatar
- `GET /avatar/my-inventory` - Get current user's inventory
- `POST /avatar/add-item/:itemType/:itemId` - Add item to user's inventory
- `GET /avatar/user/:userId` - Get specific user's avatar

### Item Management

- `GET /microphones` - Get all available microphones
- `GET /microphones/rarity/:rarity` - Get microphones by rarity
- `GET /microphones/unlockable` - Get unlockable microphones
- `GET /outfits` - Get all available outfits
- `GET /outfits/seasonal` - Get seasonal outfits
- `GET /shoes` - Get all available shoes

## Database Schema

### Tables Created

- `microphones` - Microphone items catalog
- `outfits` - Outfit items catalog
- `shoes` - Shoe items catalog
- `user_avatars` - User avatar configurations
- `user_microphones` - User microphone inventory
- `user_outfits` - User outfit inventory
- `user_shoes` - User shoe inventory

## Setup

1. **Run Migration**:

   ```bash
   npm run migration:run
   ```

2. **Seed Default Items**:
   ```bash
   npm run seed:avatars
   ```

## Usage Examples

### Get User's Avatar

```typescript
const avatar = await avatarService.getUserAvatar(userId);
```

### Update User's Avatar

```typescript
const updateDto = {
  baseAvatarId: 'avatar_2',
  microphoneId: 'mic-uuid',
  outfitId: 'outfit-uuid',
  shoesId: 'shoes-uuid',
};
const updatedAvatar = await avatarService.updateUserAvatar(userId, updateDto);
```

### Add Item to Inventory

```typescript
await avatarService.addItemToInventory(userId, 'microphone', microphoneId);
```

## Business Logic

1. **One Active Avatar**: Each user can only have one active avatar at a time
2. **Ownership Validation**: Users can only equip items they own
3. **Default Avatar**: New users automatically get a default avatar
4. **Inventory Management**: Items must be added to inventory before equipping
5. **Rarity & Pricing**: Items have different rarities and prices
6. **Unlockable Content**: Some items require achievements to unlock

## Future Enhancements

- Achievement system integration
- Seasonal item rotations
- Avatar preview system
- Social sharing of avatars
- Avatar competitions/contests
- Custom avatar creation tools
