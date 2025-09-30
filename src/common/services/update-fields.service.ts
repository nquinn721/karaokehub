/**
 * Utility for building update objects from partial data
 */
export class UpdateFieldsService {
  /**
   * Build an update object with only defined fields
   * @param updateData - Partial data containing potential updates
   * @param allowedFields - Array of field names that are allowed to be updated
   * @returns Object with only defined fields from the allowed list
   */
  static buildUpdateFields<T>(updateData: Partial<T>, allowedFields: (keyof T)[]): Partial<T> {
    const updateFields: Partial<T> = {};

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    });

    return updateFields;
  }

  /**
   * Build update fields with custom transformation
   * @param updateData - Partial data containing potential updates
   * @param fieldMappings - Object mapping input fields to output fields with optional transformers
   * @returns Transformed update object
   */
  static buildUpdateFieldsWithMapping<TInput, TOutput>(
    updateData: Partial<TInput>,
    fieldMappings: {
      [K in keyof TInput]?: {
        targetField: keyof TOutput;
        transform?: (value: TInput[K]) => any;
      };
    },
  ): Partial<TOutput> {
    const updateFields: Partial<TOutput> = {};

    Object.keys(fieldMappings).forEach((inputField) => {
      const key = inputField as keyof TInput;
      const mapping = fieldMappings[key];

      if (mapping && updateData[key] !== undefined) {
        const value = mapping.transform ? mapping.transform(updateData[key]!) : updateData[key];
        updateFields[mapping.targetField] = value;
      }
    });

    return updateFields;
  }

  /**
   * Check if any fields were actually provided for update
   * @param updateData - Partial data to check
   * @param allowedFields - Array of field names to check
   * @returns true if any allowed field is defined
   */
  static hasUpdateFields<T>(updateData: Partial<T>, allowedFields: (keyof T)[]): boolean {
    return allowedFields.some((field) => updateData[field] !== undefined);
  }

  /**
   * Get list of fields that are being updated
   * @param updateData - Partial data to check
   * @param allowedFields - Array of field names to check
   * @returns Array of field names that are defined in updateData
   */
  static getUpdatedFields<T>(updateData: Partial<T>, allowedFields: (keyof T)[]): (keyof T)[] {
    return allowedFields.filter((field) => updateData[field] !== undefined);
  }
}
