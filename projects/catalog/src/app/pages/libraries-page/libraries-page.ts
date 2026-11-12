import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';

import { LenziFigure, LenziFigureGrid, LenziStatusMessage, couldNotLoad } from '@lenzi/ui-kit';

import { KitFiles } from '../../shared/kit-files';

interface Library {
  name: string;
  package: string;
  url: string;
  role: string;
  rules: string[];
  versions: Partial<Record<string, string>>;
}

interface Libraries {
  about: string;
  projects: string[];
  groups: { id: string; label: string; libraries: Library[] }[];
}

/**
 * Every frontend library of lenzi's apps (projects/kit/libraries.json): what it is for, its rules,
 * and the version each project has. A library that is not here is not used.
 */
@Component({
  selector: 'app-libraries-page',
  imports: [LenziFigure, LenziFigureGrid, LenziStatusMessage, MatIconModule],
  templateUrl: './libraries-page.html',
  styleUrl: './libraries-page.css',
})
export class LibrariesPage {
  private readonly files = inject(KitFiles);

  protected readonly libraries = rxResource({ stream: () => this.files.json<Libraries>('libraries.json') });
  protected readonly failure = computed(() => (this.libraries.error() ? couldNotLoad('the libraries', this.libraries.error()) : null));

  /** The texts' `code` as code; everything else as text (escaped). */
  protected inline(text: string): string {
    const escaped = text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    return escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  }
}
