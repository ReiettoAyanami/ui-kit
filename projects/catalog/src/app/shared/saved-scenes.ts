import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { LenziScene } from '@lenzi/ui-kit/backgrounds';

import { cleanScene } from './scene-code';

/** A scene the admin keeps on the kit's server. */
export interface SavedScene {
  /** Short, the server's. */
  id: string;
  /** The scene's own name ("" when it has none). */
  name: string;
  scene: LenziScene;
  /** When it was first kept and last saved, ISO. */
  createdAt: string;
  updatedAt: string;
}

/** What the server answers with: its scene is checked before the catalog draws it. */
type Kept = Omit<SavedScene, 'scene'> & { scene: unknown };

/** A kept scene as the catalog takes it: every value checked and within bounds; null when it holds no scene. */
function read(kept: Kept): SavedScene | null {
  const scene = cleanScene(kept.scene);
  return scene ? { ...kept, scene } : null;
}

/**
 * The scenes the admin keeps (lenzi, 2026-11-14: "la sezione admin puó creare varie scene, quindi la sezione scene
 * lo porta a quelle salvate"): the gallery of the Scenes page, on the kit's server (in Docker, on its volume). The
 * admin's alone: without signing in every call fails with the server's words (an ApiError).
 */
@Injectable({
  providedIn: 'root',
})
export class SavedScenes {
  private readonly http = inject(HttpClient);

  /** The scenes kept, the last saved first. */
  list(): Observable<SavedScene[]> {
    return this.http.get<{ scenes: Kept[] }>('api/scenes').pipe(map((body) => body.scenes.map(read).filter((scene) => scene !== null)));
  }

  /** Keeps a new scene. */
  add(scene: LenziScene): Observable<SavedScene> {
    return this.http.post<Kept>('api/scenes', { scene }).pipe(map((kept) => read(kept) ?? { ...kept, scene }));
  }

  /** Saves a kept scene again, changed. */
  update(id: string, scene: LenziScene): Observable<SavedScene> {
    return this.http.put<Kept>(`api/scenes/${encodeURIComponent(id)}`, { scene }).pipe(map((kept) => read(kept) ?? { ...kept, scene }));
  }

  /** Takes a scene out of the gallery (the server marks it; it can be put back). */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`api/scenes/${encodeURIComponent(id)}`);
  }

  /** Puts back a scene that was taken out. */
  restore(id: string): Observable<SavedScene | null> {
    return this.http.post<Kept>(`api/scenes/${encodeURIComponent(id)}/restore`, {}).pipe(map(read));
  }
}
