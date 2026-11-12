import { Component, input } from '@angular/core';

import { LenziDelta, LenziFigure, LenziFigureGrid } from '@lenzi/ui-kit';

import { Values } from '../../registry';

@Component({
  selector: 'app-figure-demo',
  imports: [LenziDelta, LenziFigure, LenziFigureGrid],
  templateUrl: './figure-demo.html',
  styleUrl: './figure-demo.css',
})
export class FigureDemo {
  readonly values = input<Values>({});
}
