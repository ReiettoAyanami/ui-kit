import { Pipe, PipeTransform } from '@angular/core';

import { IdentityOffset, identityColor } from './identity-color';

/**
 * The identity colour of an id, in a template: `[style.background-color]="id | lenziIdentityColor"`,
 * or `id | lenziIdentityColor: 0.5` for a second kind of entity with its own ids.
 */
@Pipe({
  name: 'lenziIdentityColor',
})
export class LenziIdentityColorPipe implements PipeTransform {
  transform(id: number, offset: IdentityOffset = 0): string {
    return identityColor(id, offset);
  }
}
