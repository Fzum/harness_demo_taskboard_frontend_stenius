import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { NewTask, Task, TaskUpdate } from './task';

/**
 * The backend's task resource, on the app's own origin: the dev server proxies /api to the
 * backend, and in production the same reverse proxy serves both.
 */
export const TASKS_URL = '/api/tasks';
export const VERSION_URL = '/api/version';

/** The running backend build version. */
export interface BackendVersion {
  version: string;
}

/** Typed client of the Taskboard backend's REST API. Errors are application/problem+json. */
@Injectable({ providedIn: 'root' })
export class TaskApi {
  private readonly http = inject(HttpClient);

  version(): Observable<BackendVersion> {
    return this.http.get<BackendVersion>(VERSION_URL);
  }

  /** All tasks, sorted by id. */
  list(): Observable<Task[]> {
    return this.http.get<Task[]>(TASKS_URL);
  }

  get(id: number): Observable<Task> {
    return this.http.get<Task>(`${TASKS_URL}/${id}`);
  }

  create(task: NewTask): Observable<Task> {
    return this.http.post<Task>(TASKS_URL, task);
  }

  /** Replaces every editable field of the task. */
  update(id: number, update: TaskUpdate): Observable<Task> {
    return this.http.put<Task>(`${TASKS_URL}/${id}`, update);
  }

  /** Assigns the task to a user, or unassigns it with null. */
  assign(id: number, assignee: string | null): Observable<Task> {
    return this.http.put<Task>(`${TASKS_URL}/${id}/assignee`, { assignee });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${TASKS_URL}/${id}`);
  }
}
