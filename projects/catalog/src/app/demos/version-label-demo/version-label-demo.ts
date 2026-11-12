import { Component, input } from '@angular/core';

import { KitVersionLabel } from '@lenzi/ui-kit';

import { Values } from '../../registry';

@Component({
  selector: 'app-version-label-demo',
  imports: [KitVersionLabel],
  templateUrl: './version-label-demo.html',
  styleUrl: './version-label-demo.css',
})
export class VersionLabelDemo {
  readonly values = input<Values>({});
}
