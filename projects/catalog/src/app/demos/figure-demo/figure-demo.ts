import { Component, input } from '@angular/core';

import { KitDelta, KitFigure, KitFigureGrid } from '@lenzi/ui-kit';

import { Values } from '../../registry';

@Component({
  selector: 'app-figure-demo',
  imports: [KitDelta, KitFigure, KitFigureGrid],
  templateUrl: './figure-demo.html',
  styleUrl: './figure-demo.css',
})
export class FigureDemo {
  readonly values = input<Values>({});
}
