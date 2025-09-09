import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function HasVenueOrVenueData(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'hasVenueOrVenueData',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          
          // Must have either venueId OR venue creation data (name + address)
          if (obj.venueId) {
            return true; // Has existing venue ID
          }
          
          // Check if venue creation data is provided
          if (obj.venueName && obj.venueAddress) {
            return true; // Has venue name and address for creation
          }
          
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Show must have either a venue ID or venue name with address for venue creation';
        },
      },
    });
  };
}

export function RequiredForVenueCreation(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'requiredForVenueCreation',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          
          // If venueId is provided, this validation passes (not creating new venue)
          if (obj.venueId) {
            return true;
          }
          
          // If venueName is provided, then this field (address) is required
          if (obj.venueName && !value) {
            return false;
          }
          
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is required when creating a new venue`;
        },
      },
    });
  };
}
