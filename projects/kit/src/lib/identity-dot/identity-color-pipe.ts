import { Pipe, PipeTransform } from '@angular/core';

import { IdentityOffset, identityColor } from './identity-color';

/**
 * The identity colour of an id, in a template: `[style.background-color]="id | kitIdentityColor"`,
 * or `id | kitIdentityColor: 0.5` for a second kind of entity with its own ids.
 */
@Pipe({
  name: 'kitIdentityColor',
})
export class KitIdentityColorPipe implements PipeTransform {
  transform(id: number, offset: IdentityOffset = 0): string {
    return identityColor(id, offset);
  }
}
