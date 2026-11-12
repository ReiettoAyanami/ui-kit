import { Component, computed, input, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { LenziFigure, LenziFigureGrid, couldNotLoad, describeError, readPreference, writePreference } from '@lenzi/ui-kit';

import { Values } from '../../registry';

const KEY = 'kit-catalog.demo-per';

/** describeError and couldNotLoad on the error of the parameters; a choice this browser remembers. */
@Component({
  selector: 'app-utilities-demo',
  imports: [LenziFigure, LenziFigureGrid, MatButtonToggleModule],
  templateUrl: './utilities-demo.html',
  styleUrl: './utilities-demo.css',
})
export class UtilitiesDemo {
  readonly values = input<Values>({});

  private readonly error = computed(() => ({
    status: Number(this.values()['status']) || null,
    title: String(this.values()['title'] ?? ''),
    detail: String(this.values()['detail'] ?? ''),
  }));
  protected readonly described = computed(() => describeError(this.error()));
  protected readonly loadFailed = computed(() => couldNotLoad('the substances', this.error()));

  protected readonly per = signal(readPreference(KEY, (v) => (['day', 'week', 'month'].includes(v) ? v : null), 'week'));

  protected choose(per: string): void {
    this.per.set(per);
    writePreference(KEY, per);
  }
}
