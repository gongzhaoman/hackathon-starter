import { Injectable } from '@nestjs/common';

export const TOOLKIT_ID_KEY = 'toolkit:id';
export const TOOLKIT_TYPE_KEY = 'toolkit:type';

export type ToolkitType = 'BUSINESS' | 'SYSTEM';

export function toolkitId(id: string, type: ToolkitType = 'BUSINESS') {
  return function (target: any) {
    Reflect.defineMetadata(TOOLKIT_ID_KEY, id, target);
    Reflect.defineMetadata(TOOLKIT_TYPE_KEY, type, target);
    return Injectable()(target);
  };
}
