import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EMPTY, Observable, Subject, of, throwError } from 'rxjs';

import { LenziConfirmData, LenziConfirmDialog } from './confirm-dialog';

// From substance-tracker's confirm-dialog.spec.ts.
describe('LenziConfirmDialog', () => {
  let fixture: ComponentFixture<LenziConfirmDialog>;
  let closedWith: unknown[];
  let runs: number;

  const element = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    Array.from(element().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label)!;

  async function open(answer: () => Observable<unknown> | Promise<unknown>, extra: Partial<LenziConfirmData> = {}): Promise<void> {
    closedWith = [];
    runs = 0;
    const data: LenziConfirmData = {
      title: 'Delete this consumption?',
      message: 'Its quantity goes back to its batch.',
      confirm: 'Delete',
      ...extra,
      action: () => {
        runs++;
        return answer();
      },
    };
    TestBed.configureTestingModule({
      imports: [LenziConfirmDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: (value?: unknown) => closedWith.push(value) } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(LenziConfirmDialog);
    await fixture.whenStable();
  }

  it('asks, runs the action on confirm and closes with true once it succeeded', async () => {
    const pending = new Subject<void>();
    await open(() => pending);

    expect(element().querySelector('h2')?.textContent?.trim()).toBe('Delete this consumption?');
    expect(element().querySelector('p')?.textContent?.trim()).toBe('Its quantity goes back to its batch.');
    button('Delete').click();
    button('Delete').click(); // a double tap runs it once
    await fixture.whenStable();
    expect(runs).toBe(1);
    expect(button('Delete').disabled).toBe(true);
    expect(closedWith).toEqual([]);

    pending.next();
    pending.complete();
    expect(closedWith).toEqual([true]);
  });

  it('stays open on a failure, says why with the status, and can try again', async () => {
    let fail = true;
    await open(() => (fail ? throwError(() => ({ status: 409, title: 'Conflict', detail: 'Batch 8 is finished' })) : of(null)));

    button('Delete').click();
    await fixture.whenStable();
    expect(closedWith).toEqual([]);
    expect(element().querySelector('[role="alert"]')?.textContent?.trim()).toBe('Batch 8 is finished (409)');
    expect(button('Delete').disabled).toBe(false);

    fail = false;
    button('Delete').click();
    expect(closedWith).toEqual([true]);
  });

  it('takes a promise, and an action that completes with nothing is a success', async () => {
    await open(() => Promise.resolve('done'));
    button('Delete').click();
    await vi.waitFor(() => expect(closedWith).toEqual([true]));

    TestBed.resetTestingModule();
    await open(() => EMPTY);
    button('Delete').click();
    expect(closedWith).toEqual([true]);
  });

  it('Cancel closes with nothing; a non destructive action is not in the error colour', async () => {
    await open(() => of(null), { destructive: false, confirm: 'Sign out', cancel: 'Stay' });
    expect(button('Sign out').classList.contains('destructive')).toBe(false);
    button('Stay').click();
    expect(closedWith).toEqual([undefined]);
    expect(runs).toBe(0);
  });
});
