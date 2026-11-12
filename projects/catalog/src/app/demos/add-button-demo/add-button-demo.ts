import { Component, inject, input } from '@angular/core';

import { KitAddButton } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

@Component({
  selector: 'app-add-button-demo',
  imports: [KitAddButton],
  templateUrl: './add-button-demo.html',
  styleUrl: './add-button-demo.css',
})
export class AddButtonDemo {
  readonly values = input<Values>({});
  protected readonly events = inject(DemoEvents);
}
