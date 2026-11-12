import { Component, input } from '@angular/core';

import { KitNotFound } from '@lenzi/ui-kit';

import { Values } from '../../registry';

@Component({
  selector: 'app-not-found-demo',
  imports: [KitNotFound],
  templateUrl: './not-found-demo.html',
  styleUrl: './not-found-demo.css',
})
export class NotFoundDemo {
  readonly values = input<Values>({});
}
