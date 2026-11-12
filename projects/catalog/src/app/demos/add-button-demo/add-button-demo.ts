import { Component, inject, input } from '@angular/core';

import { LenziAddButton } from '@lenzi/ui-kit';

import { DemoEvents } from '../../shared/demo-events';
import { Values } from '../../registry';

@Component({
  selector: 'app-add-button-demo',
  imports: [LenziAddButton],
  templateUrl: './add-button-demo.html',
  styleUrl: './add-button-demo.css',
})
export class AddButtonDemo {
  readonly values = input<Values>({});
  protected readonly events = inject(DemoEvents);
}
