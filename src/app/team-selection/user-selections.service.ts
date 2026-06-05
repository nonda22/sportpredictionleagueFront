import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import type { SaveUserSelectionRequestDto, UserSelectionDto } from '../models';

@Injectable({ providedIn: 'root' })
export class UserSelectionsService {
  constructor(private readonly http: HttpClient) {}

  getUserSelections(contestId?: number): Observable<UserSelectionDto[]> {
    const options = contestId ? { params: new HttpParams().set('contestId', contestId) } : undefined;

    return this.http.get<UserSelectionDto[]>(`${API_BASE_URL}/user-selections`, options);
  }

  saveSelection(request: SaveUserSelectionRequestDto): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/user-selections`, request);
  }

  updateSelection(request: SaveUserSelectionRequestDto): Observable<void> {
    return this.http.put<void>(`${API_BASE_URL}/user-selections`, request);
  }
}
