# Avatar Parts Placeholder Files

This directory contains avatar customization parts for the KaraokeHub avatar system.

## Structure:
- microphones/ - Different microphone styles
- shirts/ - Various shirt and top options  
- pants/ - Different pants and bottom options
- shoes/ - Various footwear choices
- hair/ - Different hairstyles
- accessories/ - Hats, glasses, jewelry, etc.

## Rarity System:
- Common (gray) - Basic items everyone starts with
- Rare (blue) - Earned through regular play
- Epic (purple) - Special achievements or events
- Legendary (gold) - Premium items or major milestones

## Implementation Notes:
- Images should be PNG with transparency
- Base size: 200x200px recommended
- Z-index layering: shoes(5) < pants(10) < shirt(20) < hair(30) < accessories(40-50) < microphone(100)
- All parts should align with the base avatar positioning
