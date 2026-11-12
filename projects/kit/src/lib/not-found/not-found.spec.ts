import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LenziNotFound } from './not-found';

describe('LenziNotFound', () => {
  it('says the page is not found and gives one way out', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LenziNotFound);
    fixture.componentRef.setInput('linkLabel', 'Go to the tickets');
    fixture.componentRef.setInput('link', '/');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.code')?.textContent?.trim()).toBe('404');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Page not found');
    const link = element.querySelector('a')!;
    expect(link.textContent?.trim()).toBe('Go to the tickets');
    expect(link.getAttribute('href')).toBe('/');
  });

  it('keeps its words when a route binds them to undefined', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LenziNotFound);
    fixture.componentRef.setInput('linkLabel', 'Go home');
    fixture.componentRef.setInput('link', '/');
    fixture.componentRef.setInput('title', undefined);
    fixture.componentRef.setInput('text', undefined);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Page not found');
    expect(element.querySelector('.text')?.textContent?.trim()).toBe('There is nothing at this address.');
  });
});
