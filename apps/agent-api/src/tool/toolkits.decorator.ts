import { Injectable } from '@nestjs/common';

export const TOOLKIT_ID_KEY = 'toolkit:id';

export function toolkitId(id: string) {
  return function (target: any) {
    Reflect.defineMetadata(TOOLKIT_ID_KEY, id, target);
    return Injectable()(target);
  };
}
