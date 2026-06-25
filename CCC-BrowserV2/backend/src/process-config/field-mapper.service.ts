import { Injectable, Logger } from '@nestjs/common';
import { FormField } from './types/process';

export interface FieldMapping {
  fieldKey: string;
  dataKey: string;
  transform?: (value: any) => any;
  defaultValue?: any;
}

export interface MappingConfig {
  mappings: FieldMapping[];
}

@Injectable()
export class FieldMapperService {
  private readonly logger = new Logger(FieldMapperService.name);

  mapFields(userData: Record<string, any>, formFields: FormField[], config?: MappingConfig): Record<string, any> {
    const mappedData: Record<string, any> = {};

    for (const field of formFields) {
      let value = userData[field.dataKey];

      if (config?.mappings) {
        const mapping = config.mappings.find((m) => m.dataKey === field.dataKey);
        if (mapping) {
          value = userData[mapping.fieldKey];
          if (mapping.transform) {
            value = mapping.transform(value);
          }
        }
      }

      if (value === undefined || value === null) {
        const mapping = config?.mappings?.find((m) => m.dataKey === field.dataKey);
        value = mapping?.defaultValue;
      }

      mappedData[field.dataKey] = value;
    }

    this.logger.log(`Mapped ${Object.keys(mappedData).length} fields`);
    return mappedData;
  }

  validateMapping(userData: Record<string, any>, formFields: FormField[]): { valid: boolean; missingKeys: string[] } {
    const missingKeys: string[] = [];

    for (const field of formFields) {
      if (userData[field.dataKey] === undefined || userData[field.dataKey] === null) {
        missingKeys.push(field.dataKey);
      }
    }

    return {
      valid: missingKeys.length === 0,
      missingKeys,
    };
  }

  transformValue(value: any, fieldType: string): any {
    switch (fieldType) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === true || value === 1;
      case 'date':
        return new Date(value).toISOString().split('T')[0];
      case 'datetime':
        return new Date(value).toISOString();
      case 'string':
      default:
        return String(value);
    }
  }

  batchMap(dataList: Record<string, any>[], formFields: FormField[], config?: MappingConfig): Record<string, any>[] {
    return dataList.map((item) => this.mapFields(item, formFields, config));
  }

  extractKeys(formFields: FormField[]): string[] {
    return formFields.map((field) => field.dataKey);
  }
}