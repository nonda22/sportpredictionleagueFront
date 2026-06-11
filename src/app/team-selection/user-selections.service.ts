import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { SaveUserSelectionRequestDto, UpcomingEventDto, UserSelectionDto } from '../models';

@Injectable({ providedIn: 'root' })
export class UserSelectionsService {
  constructor(private readonly http: HttpClient) {}

  getUserSelections(contestId?: number): Observable<UserSelectionDto[]> {
    const options = contestId ? { params: new HttpParams().set('contestId', contestId) } : undefined;

    return this.http.get<UserSelectionDto[]>(`${API_BASE_URL}/user-selections`, options);
  }

  getUserSelectionsByUserId(userId: number, contestId?: number): Observable<UserSelectionDto[]> {
    const options = contestId ? { params: new HttpParams().set('contestId', contestId) } : undefined;

    return this.http.get<UserSelectionDto[]>(`${API_BASE_URL}/user-selections/users/${userId}`, options);
  }

  getUpcomingEvents(contestId: number): Observable<UpcomingEventDto[]> {
    const options = { params: new HttpParams().set('contestId', contestId) };

    return this.http.get<UpcomingEventDto[]>(`${API_BASE_URL}/user-selections/upcoming-events`, options);
  }

  saveSelection(request: SaveUserSelectionRequestDto): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/user-selections`, request);
  }

  updateSelection(request: SaveUserSelectionRequestDto): Observable<void> {
    return this.http.put<void>(`${API_BASE_URL}/user-selections`, request);
  }
}
